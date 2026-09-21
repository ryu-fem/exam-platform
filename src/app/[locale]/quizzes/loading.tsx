import { StudentNavbar } from "@/components/StudentNavbar";
import { Skeleton } from "@/components/ui/Skeleton";

export default function QuizzesLoading() {
  return (
    <>
      <StudentNavbar user={{ name: "", username: "" }} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
        <header className="mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        </header>
        <ul
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          aria-hidden
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}>
              <div className="card-flat flex aspect-square flex-col items-center justify-center gap-3 p-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}