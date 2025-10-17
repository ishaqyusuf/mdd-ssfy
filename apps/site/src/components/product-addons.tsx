"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { images } from "@/lib/images";

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

interface ProductAddonsProps {
  addons: Addon[];
  selectedAddons: string[];
  onAddonChange: (addonId: string, selected: boolean) => void;
}

export function ProductAddons({
  addons,
  selectedAddons,
  onAddonChange,
}: ProductAddonsProps) {
  const getAddonImage = (addonId: string) => {
    switch (addonId) {
      case "hardware-set":
        return images.addons.hardwareSet;
      case "installation":
        return images.addons.installation;
      case "trim-kit":
        return images.addons.trimKit;
      default:
        return images.placeholders.hardware;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Add-ons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className="flex items-start space-x-3 p-3 border rounded-lg"
          >
            <Checkbox
              id={addon.id}
              checked={selectedAddons.includes(addon.id)}
              onCheckedChange={(checked) =>
                onAddonChange(addon.id, checked as boolean)
              }
            />
            <div className="flex-1 flex space-x-3">
              <img
                src={getAddonImage(addon.id) || "/placeholder.svg"}
                alt={addon.name}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1">
                <Label
                  htmlFor={addon.id}
                  className="font-medium cursor-pointer"
                >
                  {addon.name}
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {addon.description}
                </p>
                <p className="text-sm font-medium text-amber-600 mt-1">
                  +${addon.price}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
