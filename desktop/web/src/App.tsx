import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

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

const TABLE_COLUMNS = [
  { key: 'company', label: 'Doanh nghiệp', initial: 17, min: 13 },
  { key: 'website', label: 'Website', initial: 10, min: 8 },
  { key: 'phone', label: 'Điện thoại', initial: 9, min: 8 },
  { key: 'email', label: 'Email', initial: 13, min: 9 },
  { key: 'socials', label: 'Mạng xã hội', initial: 12, min: 8 },
  { key: 'score', label: 'Điểm', initial: 6, min: 5 },
  { key: 'signal', label: 'Tín hiệu', initial: 14, min: 10 },
  { key: 'status', label: 'Trạng thái', initial: 8, min: 7 },
  { key: 'next', label: 'Bước tiếp theo', initial: 11, min: 10 },
];
const DEFAULT_COLUMN_WIDTHS = TABLE_COLUMNS.map(column => column.initial);
const COLUMN_WIDTHS_KEY = 'vietnam-lead-finder-column-widths-v1';

function readColumnWidths() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_WIDTHS_KEY) || 'null');
    if (Array.isArray(stored) && stored.length === TABLE_COLUMNS.length && stored.every(value => Number.isFinite(value) && value > 0)) return stored as number[];
  } catch { /* Use default widths when saved preferences cannot be read. */ }
  return DEFAULT_COLUMN_WIDTHS;
}

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
  const [columnWidths, setColumnWidths] = useState(readColumnWidths);
  const resizing = useRef<{ index: number; startX: number; left: number; right: number } | null>(null);
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
    const onPointerMove = (event: PointerEvent) => {
      const drag = resizing.current;
      if (!drag) return;
      const delta = (event.clientX - drag.startX) / Math.max(1, document.querySelector('.leads-table')?.getBoundingClientRect().width || 1) * 100;
      const leftMin = TABLE_COLUMNS[drag.index].min;
      const rightMin = TABLE_COLUMNS[drag.index + 1].min;
      const left = Math.max(leftMin, Math.min(drag.left + drag.right - rightMin, drag.left + delta));
      const right = drag.left + drag.right - left;
      setColumnWidths(current => current.map((width, index) => index === drag.index ? left : index === drag.index + 1 ? right : width));
    };
    const onPointerUp = () => {
      if (!resizing.current) return;
      resizing.current = null;
      document.body.classList.remove('resizing-columns');
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const startResize = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (index >= TABLE_COLUMNS.length - 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizing.current = { index, startX: event.clientX, left: columnWidths[index], right: columnWidths[index + 1] };
    document.body.classList.add('resizing-columns');
  };

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
          </div> : <div className="table-scroll" role="region" aria-label="Bảng quản lý doanh nghiệp, kéo tay nắm ở tiêu đề để chỉnh độ rộng cột" tabIndex={0}>
            <table className="leads-table">
              <colgroup>{columnWidths.map((width, index) => <col key={TABLE_COLUMNS[index].key} style={{ width: `${width}%` }} />)}</colgroup>
              <thead>
                <tr className="column-row">{TABLE_COLUMNS.map((column, index) => <th key={column.key} scope="col" className={`resizable-heading heading-${column.key}`}>
                  {column.label}{index < TABLE_COLUMNS.length - 1 && <button className="column-resizer" type="button" aria-label={`Kéo để đổi độ rộng cột ${column.label}`} title="Kéo để đổi độ rộng cột" onPointerDown={event => startResize(index, event)} onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    const direction = event.key === 'ArrowRight' ? 1 : -1;
                    const next = [...columnWidths];
                    const amount = event.shiftKey ? 5 : 1;
                    const left = Math.max(TABLE_COLUMNS[index].min, Math.min(next[index] + next[index + 1] - TABLE_COLUMNS[index + 1].min, next[index] + direction * amount));
                    next[index + 1] += next[index] - left;
                    next[index] = left;
                    setColumnWidths(next);
                  }} />}</th>)}</tr>
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

  const socials = [
    ['LinkedIn', lead.contact_linkedin, lead.contact_linkedin_source],
    ['Facebook', lead.contact_facebook, lead.contact_facebook_source],
    ['Instagram', lead.contact_instagram, lead.contact_instagram_source],
    ['TikTok', lead.contact_tiktok, lead.contact_tiktok_source],
    ['YouTube', lead.contact_youtube, lead.contact_youtube_source],
    ['Zalo', lead.contact_zalo, lead.contact_zalo_source],
    ['X', lead.contact_x, lead.contact_x_source],
  ].filter((item): item is [string, string, string | undefined] => Boolean(item[1]));

  return <>
    <tr className="lead-row">
      <th scope="row" className="company-cell"><strong>{lead.company_url ? <a href={lead.company_url} target="_blank" rel="noreferrer">{lead.company} ↗</a> : lead.company}</strong><span>{[lead.industry, lead.location].filter(Boolean).join(' · ') || 'Doanh nghiệp'}</span><button className="row-detail-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ẩn chi tiết' : 'Chi tiết & bằng chứng'}</button></th>
      <td data-label="Website"><ContactValue href={lead.company_url} value={linkLabel(lead.company_url)} empty="Chưa tìm thấy" /></td>
      <td data-label="Điện thoại"><ContactValue href={lead.contact_phone ? `tel:${lead.contact_phone}` : undefined} value={lead.contact_phone} source={lead.contact_phone_source} empty="Chưa tìm thấy" /></td>
      <td data-label="Email"><ContactValue href={lead.contact_email ? `mailto:${lead.contact_email}` : undefined} value={lead.contact_email} source={lead.contact_email_source} empty="Chưa tìm thấy" /></td>
      <td data-label="Mạng xã hội"><div className="social-links">{socials.length ? socials.map(([label, url, source]) => <a key={label} href={url} target="_blank" rel="noreferrer" title={source ? `${label}, nguồn dữ liệu` : label}>{label}<span className="sr-only">, mở trang công khai</span></a>) : <span className="contact-empty">Chưa tìm thấy</span>}</div></td>
      <td data-label="Điểm"><span className="table-score">{lead.score}<small>/100</small></span></td>
      <td data-label="Tín hiệu" className="signal-cell" title={lead.pain_signal || lead.evidence}>{lead.pain_signal || lead.evidence || 'Chưa có mô tả tín hiệu'}</td>
      <td data-label="Trạng thái"><select className={`table-status status-${lead.status}`} value={lead.status} disabled={busy} onChange={event => onStatus(lead, event.target.value as Status)} aria-label={`Trạng thái ${lead.company}`}><option value="new">Mới</option><option value="contacted">Đã liên hệ</option><option value="ignore">Bỏ qua</option></select></td>
      <td data-label="Bước tiếp theo" className="next-step-cell" title={lead.next_step}>{lead.next_step || 'Kiểm tra nguồn trước khi liên hệ'}
        <button className="note-toggle" aria-expanded={editing} onClick={() => setEditing(value => !value)}>{editing ? 'Đóng ghi chú' : lead.note ? 'Sửa ghi chú' : '+ Ghi chú'}</button></td>
    </tr>
    {(expanded || editing) && <tr className="detail-row"><td colSpan={TABLE_COLUMNS.length}>
      {expanded && <div className="expanded-details"><div className="detail-block"><b>Mạng xã hội & nguồn xác minh</b><div className="detail-socials">{socials.length ? socials.map(([label, url, source]) => <span key={label}><a href={url} target="_blank" rel="noreferrer">{label} ↗</a>{source && <> · <a className="contact-source" href={source} target="_blank" rel="noreferrer">Nguồn</a></>}</span>) : <span>Chưa tìm thấy hồ sơ chính thức</span>}</div></div>
        <div><b>Ngành, địa điểm, vai trò mục tiêu:</b> {[lead.industry, lead.location, lead.target_role].filter(Boolean).join(' · ') || 'Chưa có'}</div><div><b>Tín hiệu:</b> {lead.pain_signal || lead.evidence || 'Chưa có'}</div><div><b>Vì sao phù hợp:</b> {lead.why_fit || 'Chưa có'}</div><div><b>Vì sao lúc này:</b> {lead.why_now || 'Chưa có'}</div><div><b>Bước tiếp theo:</b> {lead.next_step || 'Kiểm tra nguồn trước khi liên hệ'}</div>{lead.caution && <div className="caution"><b>Lưu ý:</b> {lead.caution}</div>}
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
