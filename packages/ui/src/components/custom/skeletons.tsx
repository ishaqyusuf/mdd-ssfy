import { Skeleton } from "../skeleton";
import { cn } from "../../utils";

// 1. Profile Header Skeleton
function ProfileHeader() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// 2. Card Skeleton
function Card() {
  return (
    <div className="rounded-xl border p-4 grid gap-4">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

// 3. Table Skeleton
function Table() {
  return (
    <div className="grid gap-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// 4. Stats Widget Skeleton
function Stats() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border p-4 grid gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// 5. List Item Skeleton
function List() {
  return (
    <div className="grid gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="grid gap-1 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 6. Chat Message Skeleton
function Chat() {
  return (
    <div className="grid gap-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={cn("flex items-start gap-3", i % 2 === 0 && "justify-end")}
        >
          {i % 2 === 0 ? (
            <Skeleton className="h-6 w-1/2 rounded-xl" />
          ) : (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-1/2 rounded-xl" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// 7. Navbar Skeleton
function Navbar() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <Skeleton className="h-6 w-24" />
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-16" />
        ))}
      </div>
    </div>
  );
}

// 8. Sidebar Skeleton
function Sidebar() {
  return (
    <div className="grid gap-4 p-4 w-56 border-r">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-32" />
      ))}
    </div>
  );
}

// 9. Form Skeleton (multi-field)
function Form() {
  return (
    <div className="grid gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <div className="flex justify-end">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// 10. Dashboard Skeleton
function Dashboard() {
  return (
    <div className="grid gap-6">
      <Stats />
      <div className="grid grid-cols-2 gap-6">
        <Card />
        <Table />
      </div>
    </div>
  );
}

// 11. Hero Section Skeleton
function Hero() {
  return (
    <div className="grid gap-6 p-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-12 w-40 rounded-md" />
    </div>
  );
}

// 12. Modal Skeleton
function Modal() {
  return (
    <div className="p-6 border rounded-lg grid gap-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-full" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

// 13. Product Card Skeleton
function ProductCard() {
  return (
    <div className="border rounded-lg overflow-hidden grid gap-3 p-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  );
}

// 14. Feed Post Skeleton
function FeedPost() {
  return (
    <div className="border rounded-lg p-4 grid gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-60 w-full rounded-md" />
    </div>
  );
}

// 15. Footer Skeleton
function Footer() {
  return (
    <div className="flex justify-between items-center p-4 border-t">
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

// ---- Composite Export ----
export const Skeletons = Object.assign(
  {},
  {
    ProfileHeader,
    Card,
    Table,
    Stats,
    List,
    Chat,
    Navbar,
    Sidebar,
    Form,
    Dashboard,
    Hero,
    Modal,
    ProductCard,
    FeedPost,
    Footer,
  }
);
