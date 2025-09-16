import { BacklogsSearchFilter } from "./backlog-search-filter";
import { OpenBacklogsSheet } from "./open-backlog-sheet";

export function BacklogsHeader({}) {
  return (
    <div className="flex justify-between">
      <BacklogsSearchFilter />
      <div className="flex-1"></div>
      <OpenBacklogsSheet />
    </div>
  );
}
