/**
 * SkillsPicker — Browse and select skills.sh skills for an AI company
 *
 * Shows either:
 * 1. Auto-recommended skills (GPT-4o picks based on proposal)
 * 2. A browsable grid filtered by category
 *
 * Used in the ProductProposalModal after "Build This" launches the company,
 * or in a pre-launch step before clicking "Build This".
 */

import { useState, useEffect } from 'react';
import { Search, Check, X, ExternalLink, Loader2, Sparkles, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillEntry {
  name: string;
  tags: string[];
  url: string;
  repo: string;
}

interface InstalledResult {
  name: string;
  status: 'installed' | 'not_found' | 'failed';
  url: string;
}

interface SkillsPickerProps {
  opportunityId: string;
  companyId: string;
  onDone?: (installedSkills: string[]) => void;
  compact?: boolean; // smaller version for embedding in modal
}

// ─── Category map ─────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; tags: string[] }[] = [
  { label: 'All', tags: [] },
  { label: 'Marketing', tags: ['marketing', 'cmo', 'copy', 'content', 'growth'] },
  { label: 'Engineering', tags: ['engineering', 'backend', 'frontend'] },
  { label: 'Growth', tags: ['growth', 'cro', 'referral', 'seo'] },
  { label: 'Design', tags: ['design', 'ui', 'ux'] },
  { label: 'SaaS', tags: ['saas', 'pricing', 'onboarding', 'retention'] },
  { label: 'Mobile', tags: ['mobile', 'app', 'expo'] },
  { label: 'Product', tags: ['product', 'strategy', 'planning'] },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function SkillsPicker({ opportunityId, companyId, onDone, compact = false }: SkillsPickerProps) {
  const [allSkills, setAllSkills] = useState<SkillEntry[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [results, setResults] = useState<InstalledResult[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [mode, setMode] = useState<'recommend' | 'browse'>('recommend');

  // Load skills index from the Edge Function
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(
          `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/fetch-skills-for-company`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            // Load index only — selectedSkills:[] triggers AI recommendation
            body: JSON.stringify({ opportunityId, companyId, selectedSkills: null }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setAllSkills(data.skillsIndex || []);
          if (data.installed?.length > 0) {
            setInstalledSkills(data.installed);
            setResults(data.results || []);
            // Pre-select already installed
            setSelectedSkills(new Set(data.installed));
          }
        }
      } catch (err) {
        console.error('Failed to load skills index:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [opportunityId, companyId]);

  // Filter skills by category + search
  const filteredSkills = allSkills.filter(skill => {
    const matchesSearch = !search || skill.name.includes(search.toLowerCase()) ||
      skill.tags.some(t => t.includes(search.toLowerCase()));
    const matchesCategory = activeCategory === 'All' ||
      CATEGORIES.find(c => c.label === activeCategory)?.tags.some(t => skill.tags.includes(t));
    return matchesSearch && matchesCategory;
  });

  const toggleSkill = (name: string) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleInstall = async () => {
    if (selectedSkills.size === 0 || installing) return;
    setInstalling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/fetch-skills-for-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            opportunityId,
            companyId,
            selectedSkills: [...selectedSkills],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setInstalledSkills(data.installed || []);
        setResults(data.results || []);
        onDone?.(data.installed || []);
      }
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading skills from skills.sh...
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Agent Skills</span>
          <span className="text-xs text-white/40">from skills.sh</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('recommend')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              mode === 'recommend'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            AI Picks
          </button>
          <button
            onClick={() => setMode('browse')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              mode === 'browse'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Browse All
          </button>
        </div>
      </div>

      {/* Already installed */}
      {installedSkills.length > 0 && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
          <p className="text-xs text-green-400 font-medium mb-2">
            ✓ {installedSkills.length} skills installed in your AI company
          </p>
          <div className="flex flex-wrap gap-1.5">
            {installedSkills.map(name => (
              <span key={name} className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 text-xs">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {mode === 'recommend' ? (
        // ── AI Recommendation mode ──────────────────────────────────────────
        <div className="space-y-2">
          <p className="text-xs text-white/50">
            GPT-4o analyzed your proposal and pre-selected the most relevant skills for your team.
            Toggle any off you don't want, then click Install.
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {filteredSkills.slice(0, 12).map(skill => (
              <SkillRow
                key={skill.name}
                skill={skill}
                selected={selectedSkills.has(skill.name)}
                installed={installedSkills.includes(skill.name)}
                onToggle={() => toggleSkill(skill.name)}
              />
            ))}
          </div>
        </div>
      ) : (
        // ── Browse mode ─────────────────────────────────────────────────────
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs placeholder:text-white/30 focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.label
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Skills grid */}
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {filteredSkills.map(skill => (
              <SkillRow
                key={skill.name}
                skill={skill}
                selected={selectedSkills.has(skill.name)}
                installed={installedSkills.includes(skill.name)}
                onToggle={() => toggleSkill(skill.name)}
              />
            ))}
            {filteredSkills.length === 0 && (
              <p className="text-xs text-white/30 text-center py-4">No skills match your search</p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/8">
        <p className="text-xs text-white/40">
          {selectedSkills.size} selected
          {installedSkills.length > 0 && ` · ${installedSkills.length} already installed`}
        </p>
        <div className="flex items-center gap-2">
          <a
            href="https://skills.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            skills.sh <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={selectedSkills.size === 0 || installing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-7 px-3"
          >
            {installing ? (
              <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Installing...</>
            ) : (
              `Install ${selectedSkills.size} Skill${selectedSkills.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </div>

      {/* Install results */}
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map(r => (
            <div key={r.name} className={`flex items-center gap-2 text-xs ${
              r.status === 'installed' ? 'text-green-400' :
              r.status === 'not_found' ? 'text-yellow-400/70' : 'text-red-400/70'
            }`}>
              {r.status === 'installed' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {r.name}
              {r.status === 'not_found' && ' (not found on GitHub)'}
              {r.status === 'failed' && ' (Paperclip rejected)'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skill Row ────────────────────────────────────────────────────────────────

function SkillRow({
  skill, selected, installed, onToggle,
}: {
  skill: SkillEntry;
  selected: boolean;
  installed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={installed ? undefined : onToggle}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
        installed
          ? 'border-green-500/20 bg-green-500/5 cursor-default'
          : selected
            ? 'border-indigo-500/40 bg-indigo-500/10 cursor-pointer'
            : 'border-white/8 bg-white/3 cursor-pointer hover:border-white/15 hover:bg-white/5'
      }`}
    >
      {/* Checkbox */}
      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
        installed ? 'bg-green-500/30' :
        selected ? 'bg-indigo-500' : 'border border-white/20'
      }`}>
        {(installed || selected) && <Check className="w-2.5 h-2.5 text-white" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-white/80 truncate">{skill.name}</span>
          {installed && (
            <span className="text-[10px] text-green-400 shrink-0">installed</span>
          )}
        </div>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {skill.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] text-white/30 bg-white/5 px-1 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Link */}
      <a
        href={skill.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-white/20 hover:text-white/50 transition-colors shrink-0"
      >
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
