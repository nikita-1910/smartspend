import { useState, useEffect, useCallback } from 'react';
import { transactions as txApi } from '../api';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Page, Badge, Spinner, Empty, Btn, useToast,
  fmtMoney, fmtCat, CAT_COLORS
} from '../components/UI';

function AnomalyCard({ tx }) {
  const isExp = tx.type === 'EXPENSE';
  const dot = CAT_COLORS[tx.category] || '#888';

  return (
    <div className="anomaly-card" style={{ borderLeftColor: 'var(--amber)', borderLeftWidth: 3, borderLeftStyle: 'solid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 5 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{tx.description}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
              {tx.transactionDate} • {fmtCat(tx.category)}
            </div>
            {tx.anomalyNote && (
              <div style={{ fontSize: 12, color: 'var(--amber)', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                {tx.anomalyNote}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: isExp ? 'var(--red)' : 'var(--green)' }}>
            {isExp ? <TrendingDown size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : <TrendingUp size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
            {isExp ? '−' : '+'}₹{fmtMoney(tx.amount)}
          </div>
          <Badge color="amber"><AlertTriangle size={10} style={{ marginRight: 3 }} />Anomaly</Badge>
          <Badge color={isExp ? 'red' : 'green'}>{tx.type}</Badge>
        </div>
      </div>
    </div>
  );
}

export default function Anomalies() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await txApi.anomalies(page, 20);
      setTxs(data.content || []);
      setTotalPages(data.totalPages || 1);
    } catch { show('Failed to load anomalies', 'error'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Page
      title="Anomalies"
      subtitle="Unusual transactions flagged by the system"
    >
      {ToastEl}

      {loading ? <Spinner /> : txs.length === 0 ? (
        <div className="card fade-up">
          <Empty icon={AlertTriangle} message="No anomalies detected. Your spending looks normal!" />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text2)' }} className="fade-up">
            <AlertTriangle size={13} style={{ marginRight: 5, color: 'var(--amber)', verticalAlign: 'middle' }} />
            {txs.length} anomal{txs.length === 1 ? 'y' : 'ies'} found on this page
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="fade-up-1">
            {txs.map(tx => <AnomalyCard key={tx.id} tx={tx} />)}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
              <Btn variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Page {page + 1} of {totalPages}</span>
              <Btn variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</Btn>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
