import {
  type CurrentSection,
  type CurrentSectionKey,
  type Profile,
  type SectionKey,
  deleteSessionProfile,
  deleteToken,
  getSessionProfile,
  getToken,
  setSessionProfile,
  setToken,
} from "@/lib/session-store";
import { useRouter } from "expo-router";
import { createContext, useContext, useState } from "react";

type AuthContextProps = ReturnType<typeof useCreateAuthContext>;
const AuthContext = createContext<AuthContextProps>(undefined as any);
export const AuthProvider = AuthContext.Provider as any;

const sectionLabels: Record<SectionKey, string> = {
  jobs: "Jobs",
  dispatch: "Dispatch",
  installer: "Installer",
  driver: "Driver",
};

const sectionOrder: CurrentSectionKey[] = [
  "jobs",
  "dispatch",
  "installer",
  "driver",
  "sales",
];

const inferIsInstaller = (profile?: Profile | null) =>
  profile?.role?.name === "1099 Contractor" ||
  profile?.role?.name === "Punchout";

const inferIsAdmin = (profile?: Profile | null) =>
  !inferIsInstaller(profile) && !!profile?.can?.editJobs;

const inferIsDriver = (profile?: Profile | null) =>
  !!(profile?.can?.viewDelivery || profile?.can?.viewPickup) &&
  !inferIsInstaller(profile) &&
  !inferIsAdmin(profile);

const createEmptyCurrentSection = (): CurrentSection => ({
  isJobs: false,
  isInstaller: false,
  isDispatch: false,
  isDriver: false,
});

const sectionKeyToCurrentSection = (
  sectionKey?: CurrentSectionKey | null,
): CurrentSection => ({
  isJobs: sectionKey === "jobs",
  isInstaller: sectionKey === "installer",
  isDispatch: sectionKey === "dispatch",
  isDriver: sectionKey === "driver",
});

const inferCurrentSectionKey = (
  currentSection?: CurrentSection | null,
  currentSectionKey?: CurrentSectionKey | null,
): CurrentSectionKey | null => {
  if (currentSectionKey) return currentSectionKey;
  if (!currentSection) return null;
  if (currentSection.isJobs) return "jobs";
  if (currentSection.isDispatch) return "dispatch";
  if (currentSection.isInstaller) return "installer";
  if (currentSection.isDriver) return "driver";
  return null;
};

const deriveSections = (profile?: Profile | null): SectionKey[] => {
  if (!profile) return [];
  const sectionSet = new Set<SectionKey>();
  const isAdmin = inferIsAdmin(profile);
  const isInstaller = inferIsInstaller(profile);
  const isDriver = inferIsDriver(profile);

  if (isAdmin && profile?.can?.viewHrm) sectionSet.add("jobs");
  if (isAdmin && profile?.can?.viewDelivery && profile?.can?.viewPickup)
    sectionSet.add("dispatch");
  if (isInstaller) sectionSet.add("installer");
  if (isDriver) sectionSet.add("driver");

  return ["jobs", "dispatch", "installer", "driver"].filter((key) =>
    sectionSet.has(key as SectionKey),
  ) as SectionKey[];
};

const derivePermittedSectionKeys = (
  profile?: Profile | null,
): CurrentSectionKey[] => {
  const coreSections = deriveSections(profile);
  const allSections: CurrentSectionKey[] = inferIsAdmin(profile)
    ? [...coreSections, "sales"]
    : [...coreSections];
  const unique = new Set(allSections);
  return sectionOrder.filter((key) => unique.has(key));
};

const normalizeCurrentSection = (
  profile?: Profile | null,
  preferredSectionKey?: CurrentSectionKey | null,
): {
  sections: SectionKey[];
  currentSection: CurrentSection;
  currentSectionKey: CurrentSectionKey | null;
} => {
  const sections = deriveSections(profile);
  const permittedSectionKeys = derivePermittedSectionKeys(profile);
  const existingSectionKey =
    preferredSectionKey ??
    inferCurrentSectionKey(profile?.currentSection, profile?.currentSectionKey);
  const currentSectionKey =
    existingSectionKey && permittedSectionKeys.includes(existingSectionKey)
      ? existingSectionKey
      : permittedSectionKeys[0] ?? null;

  return {
    sections,
    currentSection: currentSectionKey
      ? sectionKeyToCurrentSection(currentSectionKey)
      : createEmptyCurrentSection(),
    currentSectionKey,
  };
};

export const useCreateAuthContext = () => {
  const [profile, setProfile] = useState(getSessionProfile());
  const initialSectionState = normalizeCurrentSection(profile);
  const [sections, setSections] = useState<SectionKey[]>(
    initialSectionState.sections,
  );
  const [currentSection, setCurrentSectionState] = useState<CurrentSection>(
    initialSectionState.currentSection,
  );
  const [currentSectionKey, setCurrentSectionKey] =
    useState<CurrentSectionKey | null>(initialSectionState.currentSectionKey);
  const [token, _setToken] = useState(getToken());
  const router = useRouter();
  const isInstaller = inferIsInstaller(profile);
  const isDriver = inferIsDriver(profile);
  const isAdmin = inferIsAdmin(profile);

  const persistProfile = (nextProfile: Profile | null) => {
    if (!nextProfile) return;
    setSessionProfile(nextProfile);
  };

  const applySectionSelection = (nextSectionKey?: CurrentSectionKey | null) => {
    if (!profile) return;
    const normalized = normalizeCurrentSection(profile, nextSectionKey);
    const nextProfile: Profile = {
      ...(profile as Profile),
      sections: normalized.sections,
      currentSection: normalized.currentSection,
      currentSectionKey: normalized.currentSectionKey ?? undefined,
    };

    setSections(normalized.sections);
    setCurrentSectionState(normalized.currentSection);
    setCurrentSectionKey(normalized.currentSectionKey);
    setProfile(nextProfile);
    persistProfile(nextProfile);
  };

  return {
    profile,
    token,
    isInstaller,
    isDriver,
    isAdmin,
    sections: sections.map((key) => ({
      key,
      label: sectionLabels[key],
      isJobs: key === "jobs",
      isInstaller: key === "installer",
      isDispatch: key === "dispatch",
      isDriver: key === "driver",
    })),
    currentSection,
    currentSectionKey,
    setCurrentSection(next: CurrentSection) {
      const nextSectionKey = inferCurrentSectionKey(next);
      applySectionSelection(nextSectionKey);
    },
    setCurrentSectionByKey(nextSectionKey: CurrentSectionKey) {
      applySectionSelection(nextSectionKey);
    },
    onLogin(data) {
      _setToken(data.token);
      const { ...rest } = data as Profile;
      const storedProfile = getSessionProfile();
      const storedSectionKey = inferCurrentSectionKey(
        storedProfile?.currentSection,
        storedProfile?.currentSectionKey,
      );
      const fallbackSectionKey = inferCurrentSectionKey(
        rest.currentSection,
        rest.currentSectionKey,
      );
      const normalized = normalizeCurrentSection(
        rest,
        storedSectionKey ?? fallbackSectionKey,
      );

      const profileWithSections: Profile = {
        ...rest,
        sections: normalized.sections,
        currentSection: normalized.currentSection,
        currentSectionKey: normalized.currentSectionKey ?? undefined,
      };
      setSessionProfile(profileWithSections);
      setProfile(profileWithSections);
      setSections(normalized.sections);
      setCurrentSectionState(normalized.currentSection);
      setCurrentSectionKey(normalized.currentSectionKey);
      setToken(data.token);
      router.push("/");
    },
    onLogout() {
      deleteToken();
      deleteSessionProfile();
      setProfile(null as any);
      setSections([]);
      setCurrentSectionState(createEmptyCurrentSection());
      setCurrentSectionKey(null);

      _setToken(null);
      router.replace("/sign-in");
    },
  };
};
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within a AuthProvider");
  }
  return context;
};
