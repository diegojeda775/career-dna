import { DATA_SOURCES } from "./data";
import { cn } from "@/lib/utils";

// Source note + the attribution O*NET's CC BY 4.0 license requires
export function DataNote({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-1 text-xs text-muted-foreground", className)}>
      <p>
        Pay, growth and training come from the U.S. Bureau of Labor Statistics ({DATA_SOURCES.blsTable.replace(/^Table 1\.2 /, "").replace(/ \(Employment in thousands\)$/, "")}).
        For specialized careers they describe the parent occupation, so specialists can earn noticeably more or less.
      </p>
      <p>
        This site includes information from{" "}
        <a href="https://www.onetonline.org/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          O*NET OnLine
        </a>{" "}
        by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), O*NET {DATA_SOURCES.onetVersion} database. Used under the{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          CC BY 4.0
        </a>{" "}
        license. O*NET® is a trademark of USDOL/ETA. Career DNA has modified the information and is not endorsed by USDOL/ETA.
      </p>
    </div>
  );
}
