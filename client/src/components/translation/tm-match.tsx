import React from "react";
import { Button } from "@/components/ui/button";
import { type TranslationMemory } from "@/types";

interface TmMatchProps {
  match: TranslationMemory;
  onUse?: (translation: string) => void;
  sourceSimilarity: number;
  isDetailed?: boolean;
}

export function TmMatch({ match, onUse, sourceSimilarity, isDetailed = false }: TmMatchProps) {
  // Determine badge text based on similarity
  const getBadgeText = (similarity: number, status: string) => {
    if (similarity === 100) return "100%";
    if (status === "Reviewed") return "Reviewed";
    if (similarity >= 85) return `${similarity}%`;
    return "Fuzzy";
  };
  
  // Determine badge class based on similarity
  const getBadgeClass = (similarity: number, status: string) => {
    if (similarity === 100) return "status-badge-100";
    if (status === "Reviewed") return "status-badge-reviewed";
    if (similarity >= 85) return "status-badge-fuzzy";
    return "status-badge-mt";
  };
  
  // Handle use translation
  const handleUseTranslation = () => {
    if (onUse) {
      onUse(match.target);
    }
  };
  
  return (
    <div className="bg-accent rounded-md p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">
          {sourceSimilarity === 100 ? "Exact Match" : "Fuzzy Match"}
        </div>
        <div className={`text-xs px-1.5 py-0.5 rounded ${getBadgeClass(sourceSimilarity, match.status)}`}>
          {getBadgeText(sourceSimilarity, match.status)}
        </div>
      </div>
      
      <div className="mb-2">
        <div className="text-xs text-muted-foreground mb-1">Source:</div>
        <div className="text-sm font-mono border border-border bg-card p-2 rounded">
          <span className="highlight-match">{match.source}</span>
        </div>
      </div>
      
      <div>
        <div className="text-xs text-muted-foreground mb-1">Target:</div>
        <div className="text-sm font-mono border border-border bg-card p-2 rounded">
          <span className="highlight-match">{match.target}</span>
        </div>
      </div>
      
      {onUse && (
        <div className="mt-2 flex justify-end">
          <Button 
            size="sm"
            className="text-xs"
            onClick={handleUseTranslation}
          >
            Use This Translation
          </Button>
        </div>
      )}
    </div>
  );
}
