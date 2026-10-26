import { ChangeEvent, useEffect, useRef, useState } from 'react';

type Status = 'new' | 'contacted' | 'ignore';
type Lead = {
  id: string;
  company: string;
  company_url?: string;
  industry?: string;
  location?: string;
  score: number;
  stage?: string;
  pain_signal?: string;
  evidence?: string;
  source_type?: string;
  source_title?: string;
  source_url?: string;
  signal_date?: string;
  checked_at?: string;
  dimensions_json?: string;
  target_role?: string;
  contact_url?: string;
  contact_label?: string;
  contact_phone?: string;
  contact_phone_source?: string;
  contact_email?: string;
  contact_email_source?: string;
  contact_linkedin?: string;
  contact_linkedin_source?: string;
  contact_facebook?: string;
  contact_facebook_source?: string;
  contact_instagram?: string;
  contact_instagram_source?: string;
  contact_tiktok?: string;
  contact_tiktok_source?: string;
  contact_youtube?: string;
  contact_youtube_source?: string;
  contact_zalo?: string;
  contact_zalo_source?: string;
  contact_x?: string;
  contact_x_source?: string;
  why_fit?: string;
  why_now?: string;
  next_step?: string;
  caution?: string;
  status: Status;
  note: string;
};
type Counts = Record<'all' | 'average' | Status, number>;
type Filter = 'all' | Status;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'new', label: 'Mới' },
  { key: 'contacted', label: 'Đã liên hệ' },
  { key: 'ignore', label: 'Bỏ qua' },
];

const STATUS_LABEL: Record<Status, string> = {
  new: 'Mới', contacted: 'Đã liên hệ', ignore: 'Bỏ qua',
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
  return data as T;
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, average: 0, new: 0, contacted: 0, ignore: 0 });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const exportParams = new URLSearchParams();
  if (filter !== 'all') exportParams.set('status', filter);
  if (query.trim()) exportParams.set('q', query.trim());
  const exportSuffix = exportParams.size ? `?${exportParams.toString()}` : '';

  const load = async (activeFilter = filter, search = query) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('status', activeFilter);
      if (search.trim()) params.set('q', search.trim());
      const data = await api<{ leads: Lead[]; counts: Counts }>(`/api/leads?${params}`);
      setLeads(data.leads);
      setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load('all', ''); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(filter, query); }, 200);
    return () => window.clearTimeout(timer);
  }, [filter, query]);

  const changeStatus = async (lead: Lead, status: Status) => {
    setBusyId(lead.id);
    try {
      await api(`/api/leads/${encodeURIComponent(lead.id)}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setNotice(`${lead.company}: đã chuyển sang “${STATUS_LABEL[status]}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được trạng thái.');
    } finally { setBusyId(''); }
  };

  const saveNote = async (lead: Lead, note: string) => {
    setBusyId(lead.id);
    try {
      await api(`/api/leads/${encodeURIComponent(lead.id)}`, {
        method: 'PATCH', body: JSON.stringify({ note }),
      });
      setNotice('Đã lưu ghi chú trên máy này.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được ghi chú.');
    } finally { setBusyId(''); }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('Đang kiểm tra và nhập dữ liệu...');
    try {
      const data = JSON.parse(await file.text());
      const result = await api<{ added: number; duplicates: number; updated_contacts?: number }>('/api/import', {
        method: 'POST', body: JSON.stringify({ data }),
      });
      setNotice(`Đã nhập ${result.added} doanh nghiệp${result.updated_contacts ? `, bổ sung thông tin liên hệ cho ${result.updated_contacts} lead` : ''}${result.duplicates > (result.updated_contacts || 0) ? `, giữ nguyên ${result.duplicates - (result.updated_contacts || 0)} lead trùng` : ''}.`);
      setFilter('all');
      setQuery('');
      await load('all', '');
    } catch (err) {
      setNotice('');
      setError(err instanceof Error ? err.message : 'Không đọc được file JSON.');
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Vietnam Lead Finder, trang chủ">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>Lead Finder <span className="brand-vn">VIỆT NAM</span></span>
        </a>
        <div className="local-badge"><span aria-hidden="true" /> Dữ liệu lưu trên máy này</div>
      </header>

      <section className="welcome" id="top">
        <div>
          <p className="overline">BẢNG ĐIỀU KHIỂN MARKETING</p>
          <h1>Khách hàng tiềm năng,<br /><span>có căn cứ để chọn.</span></h1>
          <p className="welcome-copy">Xem tín hiệu công khai, đánh giá mức độ phù hợp và theo dõi các doanh nghiệp đã liên hệ.</p>
        </div>
        <div className="welcome-actions">
          <button className="button button-primary" onClick={() => fileRef.current?.click()}>
            <span aria-hidden="true">＋</span> Nhập kết quả nghiên cứu
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} aria-label="Chọn file analysis JSON" />
          <p>Chọn file <code>analysis.json</code> do AI tạo từ skill.</p>
        </div>
      </section>

      <section className="stats" aria-label="Tổng quan lead">
        <div className="stat-card"><span className="stat-icon stat-green">L</span><div><span className="stat-label">Tổng doanh nghiệp</span><strong>{counts.all}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-amber">M</span><div><span className="stat-label">Chưa xử lý</span><strong>{counts.new}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-blue">✓</span><div><span className="stat-label">Đã liên hệ</span><strong>{counts.contacted}</strong></div></div>
        <div className="stat-card"><span className="stat-icon stat-violet">↗</span><div><span className="stat-label">Điểm phù hợp trung bình</span><strong>{counts.average}<small>/100</small></strong></div></div>
      </section>

      <section className="lead-section" aria-labelledby="leads-heading">
        <div className="section-heading">
          <div><p className="overline">DANH SÁCH CỦA BẠN</p><h2 id="leads-heading">Doanh nghiệp</h2></div>
          <div className="exports">
            <a className="button button-light" href={`/api/export.csv${exportSuffix}`}>Tải CSV</a>
            <a className="button button-dark" href={`/api/export.xlsx${exportSuffix}`}>Xuất Excel</a>
          </div>
        </div>

        <div className="toolbar">
          <div className="filters" role="group" aria-label="Lọc theo trạng thái">
            {FILTERS.map(item => <button key={item.key} aria-pressed={filter === item.key}
              className={`filter-tab ${filter === item.key ? 'active' : ''}`} onClick={() => setFilter(item.key)}>
              {item.label}<span>{counts[item.key]}</span>
            </button>)}
          </div>
          <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm doanh nghiệp, ngành..." aria-label="Tìm doanh nghiệp" /></label>
        </div>

        {notice && <div className="notice" role="status"><span aria-hidden="true">✓</span>{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Đóng lỗi">×</button></div>}

        {loading ? <div className="empty-state"><div className="loader" /><p>Đang tải danh sách...</p></div>
          : leads.length === 0 ? <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">＋</div>
            <h3>{counts.all === 0 ? 'Bắt đầu với shortlist đầu tiên' : 'Chưa có doanh nghiệp trong mục này'}</h3>
            <p>{counts.all === 0 ? 'Khi AI hoàn thành tìm kiếm, nhập file analysis.json để xem bằng chứng và quản lý lead tại đây.' : 'Chọn mục trạng thái khác hoặc thay đổi từ khóa tìm kiếm.'}</p>
            {counts.all === 0 && <button className="button button-primary" onClick={() => fileRef.current?.click()}>Chọn file nghiên cứu</button>}
          </div> : <div className="table-scroll" role="region" aria-label="Bảng quản lý doanh nghiệp, kéo ngang để xem đầy đủ cột" tabIndex={0}>
            <table className="leads-table">
              <thead>
                <tr className="group-row"><th rowSpan={2} scope="col">Doanh nghiệp</th><th colSpan={10} scope="colgroup">Thông tin liên hệ công khai</th><th colSpan={2} scope="colgroup">Đánh giá</th><th colSpan={3} scope="colgroup">Theo dõi</th></tr>
                <tr className="column-row"><th>Website</th><th>Điện thoại</th><th>Email</th><th>LinkedIn</th><th>Facebook</th><th>Instagram</th><th>TikTok</th><th>YouTube</th><th>Zalo</th><th>X</th><th>Điểm</th><th>Tín hiệu</th><th>Trạng thái</th><th>Bước tiếp theo</th><th>Ghi chú</th></tr>
              </thead>
              <tbody>{leads.map(lead => <LeadRow key={lead.id} lead={lead} busy={busyId === lead.id} onStatus={changeStatus} onSaveNote={saveNote} />)}</tbody>
            </table>
          </div>}
      </section>

      <footer className="footer"><span>Vietnam Lead Finder</span><span>Không gửi liên hệ tự động · Chỉ lưu trên máy này</span></footer>
    </main>
  );
}

function LeadRow({ lead, busy, onStatus, onSaveNote }: {
  lead: Lead; busy: boolean; onStatus: (lead: Lead, status: Status) => void;
  onSaveNote: (lead: Lead, note: string) => void;
}) {
  const [draft, setDraft] = useState(lead.note || '');
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setDraft(lead.note || ''), [lead.note]);

  return <>
    <tr className="lead-row">
      <th scope="row" className="company-cell"><strong>{lead.company_url ? <a href={lead.company_url} target="_blank" rel="noreferrer">{lead.company} ↗</a> : lead.company}</strong><span>{[lead.industry, lead.location, lead.target_role].filter(Boolean).join(' · ') || 'Doanh nghiệp'}</span><button className="row-detail-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ẩn chi tiết' : 'Xem bằng chứng'}</button></th>
      <td><ContactValue href={lead.company_url} value={linkLabel(lead.company_url)} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_phone ? `tel:${lead.contact_phone}` : undefined} value={lead.contact_phone} source={lead.contact_phone_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_email ? `mailto:${lead.contact_email}` : undefined} value={lead.contact_email} source={lead.contact_email_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_linkedin} value={linkLabel(lead.contact_linkedin)} source={lead.contact_linkedin_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_facebook} value={linkLabel(lead.contact_facebook)} source={lead.contact_facebook_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_instagram} value={linkLabel(lead.contact_instagram)} source={lead.contact_instagram_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_tiktok} value={linkLabel(lead.contact_tiktok)} source={lead.contact_tiktok_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_youtube} value={linkLabel(lead.contact_youtube)} source={lead.contact_youtube_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_zalo} value={linkLabel(lead.contact_zalo)} source={lead.contact_zalo_source} empty="Chưa tìm thấy" /></td>
      <td><ContactValue href={lead.contact_x} value={linkLabel(lead.contact_x)} source={lead.contact_x_source} empty="Chưa tìm thấy" /></td>
      <td><span className="table-score">{lead.score}<small>/100</small></span></td>
      <td className="signal-cell" title={lead.pain_signal || lead.evidence}>{lead.pain_signal || lead.evidence || 'Chưa có mô tả tín hiệu'}</td>
      <td><select className={`table-status status-${lead.status}`} value={lead.status} disabled={busy} onChange={event => onStatus(lead, event.target.value as Status)} aria-label={`Trạng thái ${lead.company}`}><option value="new">Mới</option><option value="contacted">Đã liên hệ</option><option value="ignore">Bỏ qua</option></select></td>
      <td className="next-step-cell" title={lead.next_step}>{lead.next_step || 'Kiểm tra nguồn trước khi liên hệ'}</td>
      <td><button className="note-toggle" aria-expanded={editing} onClick={() => setEditing(value => !value)}>{editing ? 'Đóng' : lead.note ? 'Sửa ghi chú' : '+ Ghi chú'}</button></td>
    </tr>
    {(expanded || editing) && <tr className="detail-row"><td colSpan={16}>
      {expanded && <div className="expanded-details"><div><b>Tín hiệu:</b> {lead.pain_signal || lead.evidence || 'Chưa có'}</div><div><b>Vì sao phù hợp:</b> {lead.why_fit || 'Chưa có'}</div><div><b>Vì sao lúc này:</b> {lead.why_now || 'Chưa có'}</div>{lead.caution && <div className="caution"><b>Lưu ý:</b> {lead.caution}</div>}
        {lead.source_url && <a href={lead.source_url} target="_blank" rel="noreferrer">Mở nguồn: {lead.source_title || lead.source_url} ↗</a>}<p className="evidence-meta">{lead.source_type || 'Nguồn công khai'} · Tín hiệu: {lead.signal_date || 'Chưa xác định'} · Kiểm tra: {lead.checked_at || 'Không có dữ liệu'}</p>{lead.dimensions_json && <ScoreBreakdown value={lead.dimensions_json} />}</div>}
      {editing && <div className="note-editor"><label htmlFor={`note-${lead.id}`}>Ghi chú nội bộ</label><textarea id={`note-${lead.id}`} value={draft} maxLength={4000} onChange={event => setDraft(event.target.value)} placeholder="Ghi lại kết quả trao đổi hoặc việc cần làm..." /><div><span>{draft.length}/4000</span><button className="button button-dark" disabled={busy || draft === (lead.note || '')} onClick={() => onSaveNote(lead, draft)}>Lưu ghi chú</button></div></div>}
    </td></tr>}
  </>;
}

function ContactValue({ href, value, source, empty }: { href?: string; value?: string; source?: string; empty: string }) {
  if (!value) return <span className="contact-empty">{empty}</span>;
  return <span className="contact-wrap">{href ? <a className="contact-value" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{value}</a> : <span className="contact-value">{value}</span>}{source && <a className="contact-source" href={source} target="_blank" rel="noreferrer">Nguồn</a>}</span>;
}

function linkLabel(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/$/, '');
    return `${url.hostname.replace(/^www\./, '')}${path === '' ? '' : path}`;
  } catch {
    return value;
  }
}

function ScoreBreakdown({ value }: { value: string }) {
  const labels: Record<string, string> = {
    pain_strength: 'Mức độ nhu cầu', product_fit: 'Độ phù hợp', timing: 'Thời điểm',
    reachability: 'Khả năng tiếp cận', evidence_quality: 'Chất lượng bằng chứng',
  };
  try {
    const dimensions = JSON.parse(value) as Record<string, number>;
    return <div className="score-breakdown">{Object.entries(labels).map(([key, label]) => <span key={key}>{label} <b>{dimensions[key] ?? 0}/5</b></span>)}</div>;
  } catch {
    return null;
  }
}
