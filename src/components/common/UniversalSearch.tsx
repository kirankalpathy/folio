import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AutoComplete, Input } from 'antd';
import { Landmark, PiggyBank, Search } from 'lucide-react';
import { useDeposits } from '../../hooks/useDeposits';
import { useFinancialInstitutions } from '../../hooks/useFinancialInstitutions';
import { useI18n } from '../../i18n';
import { accountLabel } from '../deposits/depositTableHelpers';
import { cn } from '../../utils/cn';
import { matchScore } from '../../utils/search';

interface SearchOption {
  value: string;
  path: string;
  label: string;
  type: 'deposit' | 'institution';
  subtitle?: string;
  searchText: string;
}

function navigateTo(path: string): void {
  const hash = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}


interface UniversalSearchProps {
  className?: string;
}

export default function UniversalSearch({ className }: UniversalSearchProps) {
  const { t } = useI18n();
  const { deposits } = useDeposits();
  const { institutions } = useFinancialInstitutions();
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo<SearchOption[]>(() => {
    const institutionById = new Map(institutions.map((fi) => [fi.id, fi]));

    const depositOptions: SearchOption[] = deposits.map((d) => {
      const label = d.name || d.depositNumber || d.bankName || t('universalSearch.type.deposit');
      const accountTypeLabel = accountLabel(d.accountType, t);
      const institution = d.financialInstitutionId ? institutionById.get(d.financialInstitutionId) : undefined;
      const parts = [
        d.depositNumber || null,
        accountTypeLabel,
        d.bankName,
        d.accountNumber ? `••${d.accountNumber.slice(-4)}` : null,
      ].filter(Boolean);
      return {
        value: `deposit:${d.id}`,
        path: `/deposits/${d.id}`,
        label,
        type: 'deposit',
        subtitle: parts.join(' · '),
        searchText: [label, d.depositNumber, d.accountNumber, d.bankName, institution?.name, institution?.nickname, d.accountType, accountTypeLabel, t('universalSearch.type.deposit')].filter(Boolean).join(' '),
      };
    });

    const institutionOptions: SearchOption[] = institutions.map((fi) => {
      const label = fi.name || t('universalSearch.type.institution');
      const parts = [fi.nickname, fi.branchName, fi.accountNumber ? `••${fi.accountNumber.slice(-4)}` : null].filter(Boolean);
      return {
        value: `institution:${fi.id}`,
        path: `/institutions/${fi.id}`,
        label,
        type: 'institution',
        subtitle: parts.join(' · '),
        searchText: [label, fi.nickname, fi.branchName, fi.accountNumber, fi.category, t('universalSearch.type.institution')].filter(Boolean).join(' '),
      };
    });

    return [...institutionOptions, ...depositOptions];
  }, [deposits, institutions, t]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return allOptions
      .map((o) => ({ option: o, score: matchScore(q, o.searchText) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.option);
  }, [allOptions, query]);

  const options = useMemo(() => {
    if (!query.trim() || filtered.length === 0) return [];

    const groups: Array<{ label: string; options: Array<{ value: string; label: ReactNode }> }> = [];
    const inst = filtered.filter((o) => o.type === 'institution');
    const deps = filtered.filter((o) => o.type === 'deposit');

    const renderOption = (o: SearchOption) => (
      <div className="flex min-w-0 items-center gap-2 py-0.5">
        <span className="shrink-0 text-folio-ink/45 dark:text-white/45">
          {o.type === 'institution' ? <Landmark size={14} /> : <PiggyBank size={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.8125rem] text-folio-ink dark:text-folio-cream">{o.label}</div>
          {o.subtitle ? <div className="truncate text-[0.6875rem] text-folio-ink/45 dark:text-white/40">{o.subtitle}</div> : null}
        </div>
      </div>
    );

    const groupDefs = [
      { key: 'institution', label: t('universalSearch.type.institution'), items: inst },
      { key: 'deposit', label: t('universalSearch.type.deposit'), items: deps },
    ].filter((g) => g.items.length > 0)
      .sort((a, b) => filtered.indexOf(a.items[0]!) - filtered.indexOf(b.items[0]!));

    for (const g of groupDefs) {
      groups.push({
        label: g.label,
        options: g.items.map((o) => ({ value: o.value, label: renderOption(o) })),
      });
    }
    return groups;
  }, [filtered, query, t]);

  const handleSelect = (value: string) => {
    const selected = allOptions.find((o) => o.value === value);
    if (!selected) return;
    setQuery('');
    navigateTo(selected.path);
  };

  const handleChange = (value: string) => {
    if (allOptions.some((o) => o.value === value)) return;
    setQuery(value);
  };

  return (
    <div ref={containerRef} data-no-drag data-tauri-drag-region="false" className={cn('relative w-full', !className?.includes('max-w-') && 'max-w-[40rem]', className)}>
      <AutoComplete
        value={query}
        options={options}
        onSearch={setQuery}
        onSelect={handleSelect}
        onChange={handleChange}
        style={{ width: '100%' }}
        popupMatchSelectWidth
        getPopupContainer={() => containerRef.current ?? document.body}
        classNames={{ popup: { root: 'border border-folio-ink/10 dark:border-white/10 rounded-lg shadow-folio' } }}
        notFoundContent={query.trim() && filtered.length === 0 ? <span className="text-xs text-folio-ink/45 dark:text-white/40">{t('universalSearch.empty')}</span> : null}
      >
        <Input
          size="small"
          allowClear
          prefix={<Search size={12} className="text-folio-ink/35 dark:text-white/35" />}
          placeholder={t('universalSearch.placeholder')}
          aria-label={t('universalSearch.placeholder')}
          className="!h-7 !rounded-lg !bg-folio-ink/[0.03] dark:!bg-white/[0.04] !text-center !text-[0.6875rem] !transition-none placeholder:!text-center placeholder:!text-folio-ink/35 dark:placeholder:!text-white/35"
        />
      </AutoComplete>
    </div>
  );
}
