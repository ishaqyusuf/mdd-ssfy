import { Tabs as TabsRoot, TabsContent, TabsList, TabsTrigger } from "./tabs";

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
