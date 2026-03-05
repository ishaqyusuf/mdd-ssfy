import {
  type CurrentSection,
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
export const AuthContext = createContext<AuthContextProps>(undefined as any);
export const AuthProvider = AuthContext.Provider as any;

const sectionLabels: Record<SectionKey, string> = {
  jobs: "Jobs",
  dispatch: "Dispatch",
  installer: "Installer",
  driver: "Driver",
};

const inferIsInstaller = (profile?: Profile | null) =>
  profile?.role?.name === "1099 Contractor" || profile?.role?.name === "Punchout";

const inferIsAdmin = (profile?: Profile | null) =>
  !inferIsInstaller(profile) && !!profile?.can?.editJobs;

const inferIsDriver = (profile?: Profile | null) =>
  !!(profile?.can?.viewDelivery || profile?.can?.viewPickup) &&
  !inferIsInstaller(profile);

const createEmptyCurrentSection = (): CurrentSection => ({
  isJobs: false,
  isInstaller: false,
  isDispatch: false,
  isDriver: false,
});

const sectionToCurrentSection = (section: SectionKey): CurrentSection => ({
  isJobs: section === "jobs",
  isInstaller: section === "installer",
  isDispatch: section === "dispatch",
  isDriver: section === "driver",
});

const isCurrentSectionAllowed = (
  currentSection: CurrentSection | null | undefined,
  sections: SectionKey[],
) => {
  if (!currentSection) return false;
  return sections.some((section) => {
    if (section === "jobs") return currentSection.isJobs;
    if (section === "installer") return currentSection.isInstaller;
    if (section === "dispatch") return currentSection.isDispatch;
    return currentSection.isDriver;
  });
};

const deriveSections = (profile?: Profile | null): SectionKey[] => {
  if (!profile) return [];
  const sectionSet = new Set<SectionKey>();
  const isAdmin = inferIsAdmin(profile);
  const isInstaller = inferIsInstaller(profile);
  const isDriver = inferIsDriver(profile);

  if (isAdmin && profile?.can?.viewHrm) sectionSet.add("jobs");
  if (isAdmin && profile?.can?.viewDispatch) sectionSet.add("dispatch");
  if (isInstaller) sectionSet.add("installer");
  if (isDriver) sectionSet.add("driver");

  return ["jobs", "dispatch", "installer", "driver"].filter((key) =>
    sectionSet.has(key as SectionKey),
  ) as SectionKey[];
};

const normalizeCurrentSection = (
  profile?: Profile | null,
): { sections: SectionKey[]; currentSection: CurrentSection } => {
  const derivedSections = deriveSections(profile);
  const sections = derivedSections.length ? derivedSections : [];
  const existingCurrentSection = profile?.currentSection;
  const currentSection = isCurrentSectionAllowed(existingCurrentSection, sections)
    ? existingCurrentSection!
    : sections.length
      ? sectionToCurrentSection(sections[0]!)
      : createEmptyCurrentSection();
  return { sections, currentSection };
};

export const useCreateAuthContext = () => {
  const [profile, setProfile] = useState(getSessionProfile());
  const initialSectionState = normalizeCurrentSection(profile);
  const [sections, setSections] = useState<SectionKey[]>(initialSectionState.sections);
  const [currentSection, setCurrentSectionState] = useState<CurrentSection>(
    initialSectionState.currentSection,
  );
  const [token, _setToken] = useState(getToken());
  const router = useRouter();
  const isInstaller = inferIsInstaller(profile);
  const isDriver = inferIsDriver(profile);
  const isAdmin = inferIsAdmin(profile);

  const persistProfile = (nextProfile: Profile | null) => {
    if (!nextProfile) return;
    setSessionProfile(nextProfile);
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
    setCurrentSection(next: CurrentSection) {
      if (!profile) return;
      const nextSection = isCurrentSectionAllowed(next, sections)
        ? next
        : sections.length
          ? sectionToCurrentSection(sections[0]!)
          : createEmptyCurrentSection();
      setCurrentSectionState(nextSection);
      const nextProfile = {
        ...(profile as Profile),
        sections,
        currentSection: nextSection,
      };
      setProfile(nextProfile);
      persistProfile(nextProfile);
    },
    onLogin(data) {
      _setToken(data.token);
      const { ...rest } = data as Profile;
      const { sections: nextSections, currentSection: nextCurrentSection } =
        normalizeCurrentSection(rest);
      const profileWithSections: Profile = {
        ...rest,
        sections: nextSections,
        currentSection: nextCurrentSection,
      };
      setSessionProfile(profileWithSections);
      setProfile(profileWithSections);
      setSections(nextSections);
      setCurrentSectionState(nextCurrentSection);
      setToken(data.token);
      router.push("/");
    },
    onLogout() {
      deleteToken();
      deleteSessionProfile();
      setProfile(null as any);
      setSections([]);
      setCurrentSectionState(createEmptyCurrentSection());

      _setToken(null);
      // router.replace("/");
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
