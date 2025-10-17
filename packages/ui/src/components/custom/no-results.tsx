import { Button } from "../button";

interface Props {
  setFilter;
}
export function NoResults(props: Props) {
  return (
    <div className="flex items-center justify-center ">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">No results</h2>
          <p className="text-[#606060] text-sm">
            Try another search, or adjusting the filters
          </p>
        </div>

        {!props.setFilter || (
          <Button variant="outline" onClick={() => props?.setFilter(null)}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
