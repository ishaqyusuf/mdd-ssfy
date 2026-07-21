import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

interface Specification {
  label: string;
  value: string;
}

interface ProductSpecificationsProps {
  specifications: Specification[];
}

export function ProductSpecifications({
  specifications,
}: ProductSpecificationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {specifications.map((spec, index) => (
            <div
              key={index}
              className="flex justify-between py-2 border-b last:border-b-0"
            >
              <span className="font-medium text-gray-700">{spec.label}</span>
              <span className="text-gray-900">{spec.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
