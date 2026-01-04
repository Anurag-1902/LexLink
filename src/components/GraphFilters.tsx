import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Search, Filter, X, Calendar, Building2, Scale, Link2, AlertTriangle, Users } from "lucide-react";

export interface GraphFilters {
  searchQuery: string;
  courts: string[];
  jurisdictions: string[];
  dateRange: { start: string; end: string };
  relationshipTypes: string[];
}

interface GraphFiltersProps {
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  availableCourts: string[];
  availableJurisdictions: string[];
}

const RELATIONSHIP_OPTIONS = [
  { value: "cites", label: "Citations", icon: Link2, color: "hsl(220, 60%, 60%)" },
  { value: "similar", label: "Similar", icon: Users, color: "hsl(140, 60%, 50%)" },
  { value: "contradicts", label: "Contradicts", icon: AlertTriangle, color: "hsl(320, 70%, 55%)" },
  { value: "overrules", label: "Overrules", icon: Scale, color: "hsl(0, 80%, 55%)" },
];

export const GraphFiltersComponent = ({
  filters,
  onFiltersChange,
  availableCourts,
  availableJurisdictions,
}: GraphFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (partial: Partial<GraphFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const toggleCourt = (court: string) => {
    const courts = filters.courts.includes(court)
      ? filters.courts.filter((c) => c !== court)
      : [...filters.courts, court];
    updateFilters({ courts });
  };

  const toggleJurisdiction = (jurisdiction: string) => {
    const jurisdictions = filters.jurisdictions.includes(jurisdiction)
      ? filters.jurisdictions.filter((j) => j !== jurisdiction)
      : [...filters.jurisdictions, jurisdiction];
    updateFilters({ jurisdictions });
  };

  const toggleRelationship = (type: string) => {
    const relationshipTypes = filters.relationshipTypes.includes(type)
      ? filters.relationshipTypes.filter((t) => t !== type)
      : [...filters.relationshipTypes, type];
    updateFilters({ relationshipTypes });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      courts: [],
      jurisdictions: [],
      dateRange: { start: "", end: "" },
      relationshipTypes: [],
    });
  };

  const activeFilterCount =
    filters.courts.length +
    filters.jurisdictions.length +
    filters.relationshipTypes.length +
    (filters.dateRange.start || filters.dateRange.end ? 1 : 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cases..."
          value={filters.searchQuery}
          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          className="pl-9 h-9 text-sm"
        />
        {filters.searchQuery && (
          <button
            onClick={() => updateFilters({ searchQuery: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter Cases</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  Clear all
                </Button>
              )}
            </div>

            {/* Relationship Types */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Relationships
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIP_OPTIONS.map((rel) => {
                  const Icon = rel.icon;
                  const isChecked = filters.relationshipTypes.includes(rel.value);
                  return (
                    <div
                      key={rel.value}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        isChecked ? "bg-muted border-primary/50" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleRelationship(rel.value)}
                    >
                      <Checkbox checked={isChecked} className="pointer-events-none" />
                      <Icon className="h-3.5 w-3.5" style={{ color: rel.color }} />
                      <span className="text-xs">{rel.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courts */}
            {availableCourts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Courts
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableCourts.map((court) => (
                    <div
                      key={court}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleCourt(court)}
                    >
                      <Checkbox checked={filters.courts.includes(court)} className="pointer-events-none" />
                      <span className="text-xs truncate">{court}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jurisdictions */}
            {availableJurisdictions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" />
                  Jurisdictions
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {availableJurisdictions.map((jurisdiction) => (
                    <Badge
                      key={jurisdiction}
                      variant={filters.jurisdictions.includes(jurisdiction) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleJurisdiction(jurisdiction)}
                    >
                      {jurisdiction}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) =>
                    updateFilters({
                      dateRange: { ...filters.dateRange, start: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
                <Input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) =>
                    updateFilters({
                      dateRange: { ...filters.dateRange, end: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.courts.map((court) => (
            <Badge key={court} variant="secondary" className="gap-1 text-xs pr-1">
              {court.split(" ").slice(0, 2).join(" ")}
              <button onClick={() => toggleCourt(court)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.jurisdictions.map((j) => (
            <Badge key={j} variant="secondary" className="gap-1 text-xs pr-1">
              {j}
              <button onClick={() => toggleJurisdiction(j)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.relationshipTypes.map((type) => {
            const rel = RELATIONSHIP_OPTIONS.find((r) => r.value === type);
            return (
              <Badge key={type} variant="outline" className="gap-1 text-xs pr-1" style={{ borderColor: rel?.color }}>
                {rel?.label}
                <button onClick={() => toggleRelationship(type)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {(filters.dateRange.start || filters.dateRange.end) && (
            <Badge variant="secondary" className="gap-1 text-xs pr-1">
              {filters.dateRange.start || "..."} - {filters.dateRange.end || "..."}
              <button
                onClick={() => updateFilters({ dateRange: { start: "", end: "" } })}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
