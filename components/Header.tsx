import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TableCellsIcon,
  ArchiveBoxIcon,
  CalendarDaysIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onNewExperiment: () => void;
  onWeeklySummary: () => void;
  onMonthlySummary: () => void;
  onSettings: () => void;
  onImport: () => void;
  onExport: () => void;
  onExportCsv: () => void;
  onOpenArchive: () => void;
  onJumpToToday: () => void;
  viewOffset: number;
}

const Header: React.FC<HeaderProps> = ({
  onNewExperiment,
  onWeeklySummary,
  onMonthlySummary,
  onSettings,
  onImport,
  onExport,
  onExportCsv,
  onOpenArchive,
  onJumpToToday,
  viewOffset
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm transition-colors">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.common.appName}</h1>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onNewExperiment}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t.header.newExperiment}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

          <button
            onClick={onJumpToToday}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${viewOffset === 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            title={t.header.jumpToToday}
          >
            <CalendarDaysIcon className="w-5 h-5" />
            <span className="text-sm">{t.common.today}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

          <button onClick={onWeeklySummary} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.weeklySummary}>
            <CalendarIcon className="w-6 h-6" />
          </button>
          <button onClick={onMonthlySummary} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.monthlySummary}>
            <ChartBarIcon className="w-6 h-6" />
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

          <button onClick={onOpenArchive} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.archive}>
            <ArchiveBoxIcon className="w-6 h-6" />
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

          <button onClick={onImport} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.importData}>
            <ArrowUpTrayIcon className="w-6 h-6" />
          </button>
          <button onClick={onExport} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.exportJson}>
            <ArrowDownTrayIcon className="w-6 h-6" />
          </button>
          <button onClick={onExportCsv} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.exportCsv}>
            <TableCellsIcon className="w-6 h-6" />
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

          <button onClick={toggleLanguage} className="flex items-center gap-1 px-2 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-xs" title={language === 'he' ? 'Switch to English' : 'החלף לעברית'}>
            <span className="text-base">{language === 'he' ? '🇺🇸' : '🇮🇱'}</span>
            <span>{language === 'he' ? 'EN' : 'HE'}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

          <button onClick={onSettings} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title={t.header.settings}>
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button onClick={toggleLanguage} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <span className="text-lg">{language === 'he' ? '🇺🇸' : '🇮🇱'}</span>
          </button>

          <button
            onClick={onNewExperiment}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t.common.new}</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <TableCellsIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 space-y-4 shadow-inner">
          <div className="grid grid-cols-4 gap-4">
            <button onClick={() => { onJumpToToday(); setMobileMenuOpen(false); }} className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm"><CalendarDaysIcon className="w-5 h-5" /></div>
              <span className="text-xs">{t.common.today}</span>
            </button>
            <button onClick={() => { onWeeklySummary(); setMobileMenuOpen(false); }} className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm"><CalendarIcon className="w-5 h-5" /></div>
              <span className="text-xs">{t.common.week}</span>
            </button>
            <button onClick={() => { onMonthlySummary(); setMobileMenuOpen(false); }} className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm"><ChartBarIcon className="w-5 h-5" /></div>
              <span className="text-xs">{t.common.month}</span>
            </button>
            <button onClick={() => { onOpenArchive(); setMobileMenuOpen(false); }} className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm"><ArchiveBoxIcon className="w-5 h-5" /></div>
              <span className="text-xs">{t.common.archive}</span>
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-around">
            <button onClick={onImport} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm"><ArrowUpTrayIcon className="w-4 h-4" /> {t.common.import}</button>
            <button onClick={onExport} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm"><ArrowDownTrayIcon className="w-4 h-4" /> {t.common.export}</button>
            <button onClick={onSettings} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm"><Cog6ToothIcon className="w-4 h-4" /> {t.common.settings}</button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
