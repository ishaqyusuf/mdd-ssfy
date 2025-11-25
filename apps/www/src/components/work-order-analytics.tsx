import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Activity, CheckCircle, Clock, ListTodo } from "lucide-react";

const analytics = [
  {
    title: "Total Work Orders",
    value: "1,234",
    icon: ListTodo,
    change: "+20.1% from last month",
  },
  {
    title: "Pending",
    value: "56",
    icon: Clock,
    change: "+1.9% from last month",
  },
  {
    title: "Completed",
    value: "1,178",
    icon: CheckCircle,
    change: "+12.2% from last month",
  },
  {
    title: "Avg. Completion",
    value: "3.5 days",
    icon: Activity,
    change: "-0.5% from last month",
  },
];

export function WorkOrderAnalytics() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {analytics.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
