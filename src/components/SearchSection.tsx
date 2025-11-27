import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface SearchSectionProps {
  onSearch: (query: string) => void;
  error?: string;
}

export const SearchSection = ({ onSearch, error }: SearchSectionProps) => {
  const [query, setQuery] = useState("Smith v. Jones");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <section className="bg-navy text-navy-foreground py-16 px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Search the Knowledge Graph</h2>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter case name, citation, or legal concept..."
              className="pl-12 h-14 bg-background text-foreground border-accent focus:ring-accent"
            />
          </div>
          <Button 
            type="submit"
            size="lg"
            className="px-8 bg-background text-foreground hover:bg-secondary"
          >
            Search
          </Button>
        </form>
        {error && (
          <p className="text-navy-foreground/70 text-sm mt-4">{error}</p>
        )}
      </div>
    </section>
  );
};
