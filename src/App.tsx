import { useState } from 'react';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { PortfolioChart } from './components/PortfolioChart';
import { AllocationChart } from './components/AllocationChart';
import { HoldingsTable } from './components/HoldingsTable';
import { SectorChart } from './components/SectorChart';
import { mockHoldings, generatePortfolioHistory } from './data/mockData';
import {
  calculateTotalValue,
  calculateTotalCost,
  calculateTotalGain,
  calculateTotalGainPercent,
  formatCurrency,
  formatPercent,
} from './utils/calculations';

const portfolioHistory = generatePortfolioHistory();

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

function App() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const holdings = mockHoldings;

  const totalValue = calculateTotalValue(holdings);
  const totalCost = calculateTotalCost(holdings);
  const totalGain = calculateTotalGain(holdings);
  const totalGainPercent = calculateTotalGainPercent(holdings);
  const isPositive = totalGain >= 0;

  const timeRanges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Portfolio Value"
            value={formatCurrency(totalValue)}
            subtitle={`${holdings.length} ETFs`}
            positive={null}
          />
          <StatCard
            title="Total Cost"
            value={formatCurrency(totalCost)}
            subtitle="Invested capital"
            positive={null}
          />
          <StatCard
            title="Total Gain"
            value={formatCurrency(totalGain)}
            subtitle="Absolute return"
            positive={isPositive}
          />
          <StatCard
            title="Total Return"
            value={formatPercent(totalGainPercent)}
            subtitle="Percentage return"
            positive={isPositive}
          />
        </div>

        {/* Portfolio Development Chart */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold text-lg">Portfolio Development</h2>
              <p className="text-slate-400 text-xs mt-0.5">Value vs. Cost Basis over time</p>
            </div>
            <div className="flex gap-1">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <PortfolioChart data={portfolioHistory} timeRange={timeRange} />
        </div>

        {/* Allocation & Sector Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h2 className="text-white font-semibold text-lg mb-1">Allocation by ETF</h2>
            <p className="text-slate-400 text-xs mb-4">Portfolio weight per position</p>
            <AllocationChart holdings={holdings} />
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h2 className="text-white font-semibold text-lg mb-1">Allocation by Sector</h2>
            <p className="text-slate-400 text-xs mb-4">Value distribution by asset class</p>
            <SectorChart holdings={holdings} />
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="mb-5">
            <h2 className="text-white font-semibold text-lg">Holdings</h2>
            <p className="text-slate-400 text-xs mt-0.5">All ETF positions and performance</p>
          </div>
          <HoldingsTable holdings={holdings} />
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-xs pb-4">
          PortfolioWatch — ETF Portfolio Tracker · Data for demonstration purposes only
        </footer>
      </main>
    </div>
  );
}

export default App;
