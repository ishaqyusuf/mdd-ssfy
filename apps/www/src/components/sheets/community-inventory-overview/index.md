# sheet
# sheet
## `hooks/use-community-inventory-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useCommunityInventoryParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openCommunityInventoryId: parseAsInteger
    },
    options
  );
  const opened = !!params.openCommunityInventoryId
  return {
    ...params,
    setParams,opened
  };
}
```
## `/components/sheets/community-inventory-sheet.tsx`
```typescript
import Sheet from "@gnd/ui/custom/sheet";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense } from "react";

export function CommunityInventoryOverview() {
    return (
        <Sheet sheetName="community-inventory">
            <Suspense
                fallback={
                    <>
                        <Skeletons.Dashboard />
                    </>
                }
            >
                <Content />
            </Suspense>
        </Sheet>
    );
}

function Content() {
    return (
        <Sheet.Content>
            <Sheet.Header>
                <Sheet.Title>CommunityInventory</Sheet.Title>
            </Sheet.Header>
        </Sheet.Content>
    );
}
```