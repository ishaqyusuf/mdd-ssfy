import { Document, Font, Text, View, Image } from "@react-pdf/renderer";
import { WatermarkPage } from "../sales-v2/shared/watermark-page";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
      fontWeight: 700,
    },
  ],
});

type JobsPrintData = {
  title: string;
  context: string;
  printedAt: Date | string;
  summary: {
    jobCount: number;
    totalAmount: number;
    contractorName: string;
  };
  jobs: {
    id: number;
    title: string | null;
    subtitle: string | null;
    description: string | null;
    amount: number;
    status: string | null;
    createdAt: Date | string;
    jobType: string;
    isCustom?: boolean | null;
    builderTaskName: string | null;
    contractorName: string;
    projectTitle: string;
    lotBlock: string | null;
    modelName: string | null;
  }[];
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function formatPrintDate(value: Date | string) {
  return new Date(value).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobsPdfDocument({
  data,
  baseUrl,
  title,
}: {
  data: JobsPrintData;
  baseUrl?: string;
  title?: string;
}) {
  const contractorNames = Array.from(
    new Set(data.jobs.map((job) => job.contractorName).filter(Boolean)),
  );
  const hasSingleContractor = contractorNames.length === 1;
  const contractorLabel = hasSingleContractor
    ? contractorNames[0]
    : `${contractorNames.length} contractors`;
  const contextLabel =
    data.context === "payment-portal" ? "Payment Portal Selection" : "Jobs List";

  return (
    <Document title={title || data.title}>
      <WatermarkPage
        wrap
        baseUrl={baseUrl}
        size="LETTER"
        style={{
          paddingTop: 22,
          paddingBottom: 22,
          paddingHorizontal: 24,
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily: "Inter",
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#d9d2c7",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#17332c",
              paddingVertical: 16,
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <View style={{ width: "62%" }}>
                <Image
                  src={`${baseUrl}/logo.png`}
                  style={{ width: 150, height: 58, objectFit: "contain" }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    letterSpacing: 2.2,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.68)",
                    marginTop: 4,
                  }}
                >
                  GND Contractor Jobs
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#ffffff",
                    marginTop: 6,
                  }}
                >
                  {data.title}
                </Text>
                {hasSingleContractor ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#ffffff",
                      marginTop: 6,
                    }}
                  >
                    Contractor: {contractorLabel}
                  </Text>
                ) : null}
              </View>

              <View
                style={{
                  width: "38%",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.68)",
                    marginBottom: 8,
                  }}
                >
                  Document Info
                </Text>
                <MetaLine label="Context" value={contextLabel} light />
                <MetaLine label="Printed" value={formatPrintDate(data.printedAt)} light />
                <MetaLine label="Jobs" value={String(data.summary.jobCount)} light />
                <MetaLine
                  label="Total"
                  value={formatCurrency(data.summary.totalAmount)}
                  light
                />
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: "#d9d2c7",
              backgroundColor: "#f8f5ef",
            }}
          >
            <MetricCard label="Selected Jobs" value={String(data.summary.jobCount)} />
            <MetricCard
              label="Total Amount"
              value={formatCurrency(data.summary.totalAmount)}
            />
            <MetricCard
              label={hasSingleContractor ? "Contractor" : "Contractors"}
              value={contractorLabel}
            />
          </View>
        </View>

        {data.jobs.map((job, index) => (
          <View
            key={job.id}
            wrap={false}
            style={{
              borderWidth: 1,
              borderColor: "#d9d2c7",
              padding: 14,
              marginBottom: 12,
              backgroundColor: "#fffdfa",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View style={{ width: "74%" }}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 6,
                    alignItems: "center",
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Pill value={`JOB ${index + 1}`} dark />
                  <Pill value={String(job.jobType || "v2").toUpperCase()} />
                  <Pill value={job.status || "Unknown"} subtle />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  #{job.id} {job.title}
                  {job.subtitle ? ` - ${job.subtitle}` : ""}
                </Text>
                {job.builderTaskName ? (
                  <Text
                    style={{
                      fontSize: 10.5,
                      marginTop: 5,
                      color: "#334155",
                      fontWeight: 600,
                    }}
                  >
                    Builder Task: {job.builderTaskName}
                  </Text>
                ) : null}
                {job.description ? (
                  <Text
                    style={{
                      fontSize: 10.5,
                      lineHeight: 1.45,
                      color: "#64748b",
                      marginTop: 6,
                    }}
                  >
                    {job.description}
                  </Text>
                ) : null}
              </View>

              <View
                style={{
                  width: "26%",
                  borderWidth: 1,
                  borderColor: "#d9d2c7",
                  padding: 10,
                  backgroundColor: "#ffffff",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                    color: "#94a3b8",
                  }}
                >
                  Amount
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginTop: 6,
                  }}
                >
                  {formatCurrency(job.amount)}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {!hasSingleContractor ? (
                <DetailCard label="Contractor" value={job.contractorName} />
              ) : null}
              <DetailCard label="Project" value={job.projectTitle} />
              <DetailCard
                label="Unit"
                value={
                  [job.lotBlock, job.modelName].filter(Boolean).join(" • ") ||
                  "No unit details"
                }
              />
              <DetailCard label="Created" value={formatShortDate(job.createdAt)} />
            </View>
          </View>
        ))}

        <View
          style={{
            marginTop: 4,
            borderWidth: 1,
            borderColor: "#17332c",
            backgroundColor: "#17332c",
            paddingHorizontal: 18,
            paddingVertical: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 1.7,
                color: "rgba(255,255,255,0.68)",
              }}
            >
              Print Total
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#ffffff",
                marginTop: 5,
              }}
            >
              {formatCurrency(data.summary.totalAmount)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 10.5, color: "#ffffff", textAlign: "right" }}>
              {data.summary.jobCount} jobs selected
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.72)",
                textAlign: "right",
                marginTop: 2,
              }}
            >
              {contractorLabel}
            </Text>
          </View>
        </View>
      </WatermarkPage>
    </Document>
  );
}

function MetaLine({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
        gap: 8,
      }}
    >
      <Text
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: light ? "rgba(255,255,255,0.72)" : "#334155",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 9.5,
          color: light ? "#ffffff" : "#0f172a",
          textAlign: "right",
          maxWidth: "62%",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#d9d2c7",
        backgroundColor: "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: 1.4,
          color: "#94a3b8",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#0f172a",
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Pill({
  value,
  dark = false,
  subtle = false,
}: {
  value: string;
  dark?: boolean;
  subtle?: boolean;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: dark ? "#17332c" : "#d9d2c7",
        backgroundColor: dark ? "#17332c" : subtle ? "#f8f5ef" : "#ffffff",
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          color: dark ? "#ffffff" : "#475569",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: "23%",
        borderWidth: 1,
        borderColor: "#e4ddd1",
        backgroundColor: "#ffffff",
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          fontSize: 8.5,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "#94a3b8",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#334155",
          marginTop: 5,
          lineHeight: 1.35,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
