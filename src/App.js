// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";

import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import logo from "./logo.png";

const STORAGE_KEY = "ptv_customers_ios_v3";

// ================== TIỆN ÍCH CHUNG ==================
function loadCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function saveCustomers(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

function formatDateDisplay(value) {
  if (!value) return "";
  if (value.includes("-")) {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y.slice(-2)}`;
  }
  return value;
}

// ================== APP SHELL ==================
function App() {
  const [view, setView] = useState("list"); // list | form | detail
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const handleExportExcel = () => {
    if (!customers || customers.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    const columns = [
      { label: "ID", key: "id" },
      { label: "Họ và tên", key: "fullName" },
      { label: "Ngày sinh", key: "dob" },
      { label: "Giới tính", key: "gender" },
      { label: "SĐT", key: "phone" },
      { label: "Email", key: "email" },
      { label: "Mã SV", key: "studentCode" },
      { label: "Khoa / Ngành", key: "major" },
      { label: "Tình trạng chính", key: "mainIssues" },
      { label: "Mục tiêu chính", key: "mainGoal" },
      { label: "Ngày lập phiếu", key: "createdAt" },
    ];

    const data = [];
    data.push(columns.map((col) => col.label));

    customers.forEach((c) => {
      const row = columns.map((col) => {
        let val = c[col.key];

        if (col.key === "dob" || col.key === "createdAt") {
          if (typeof formatDateDisplay === "function") {
            val = formatDateDisplay(val);
          } else if (val) {
            try {
              val = new Date(val).toLocaleDateString("vi-VN");
            } catch {}
          }
        }

        return val == null ? "" : val;
      });

      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách");

    const now = new Date();
    const stamp = now.toISOString().slice(0, 10);
    const fileName = `danh_sach_phieu_tu_van_${stamp}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  useEffect(() => {
    // 1. load tạm từ localStorage
    setCustomers(loadCustomers());

    // 2. sync từ Supabase
    const syncFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("phieu_tu_van")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) {
          console.error("❌ Supabase load error:", error);
          return;
        }

        if (data && Array.isArray(data)) {
          const list = data.map((row) => {
            const base = row.data || {};
            return {
              ...base,
              id: base.id || row.id,
              createdAt: base.createdAt || row.created_at,
              mainIssues: base.mainIssues || row.main_issues || "",
              mainGoal: base.mainGoal || row.main_goal || "",
              supabaseId: row.id,
            };
          });

          setCustomers(list);
          saveCustomers(list);
          console.log("✅ Đồng bộ từ Supabase, tổng khách:", list.length);
        }
      } catch (err) {
        console.error("❌ Lỗi sync Supabase:", err);
      }
    };

    syncFromSupabase();
  }, []);

  const handleAddNew = () => {
    setEditing(null);
    setSelected(null);
    setView("form");
  };

  const handleShowList = () => {
    setSelected(null);
    setEditing(null);
    setView("list");
  };

  const handleSaved = (customer, { isEdit } = {}) => {
    setCustomers((prev) => {
      let list;
      if (isEdit) {
        const existed = prev.some((c) => c.id === customer.id);
        if (existed) {
          list = prev.map((c) => (c.id === customer.id ? customer : c));
        } else {
          list = [...prev, customer];
        }
      } else {
        list = [...prev, customer];
      }
      saveCustomers(list);
      return list;
    });

    setSelected(customer);
    setEditing(null);
    setView("detail");
  };

  const handleSelectCustomer = (c) => {
    setSelected(c);
    setEditing(null);
    setView("detail");
  };

  const handleEditCustomer = (c) => {
    setEditing(c);
    setSelected(null);
    setView("form");
  };

  return (
    <div className="app-shell">
      {/* === HEADER === */}
      <header className="app-header">
        <img src={logo} className="app-logo" alt="logo" />
        <div className="header-right-content">
          <h1 className="app-header-title">THÔNG TIN TƯ VẤN DA</h1>
          <div className="app-header-actions">
            {/* Đã thêm onClick */}
            <button className="btn btn-light" onClick={handleShowList}>
              Danh sách
            </button>
            <button className="btn btn-primary" onClick={handleAddNew}>
              Thêm phiếu
            </button>
          </div>
        </div>
      </header>
      {/* === END HEADER === */}

      <main className="app-body">
        {view === "list" && (
          <CustomerList
            customers={customers}
            onSelect={handleSelectCustomer}
            onEdit={handleEditCustomer}
            onExportExcel={handleExportExcel}
          />
        )}

        {view === "form" && (
          <CustomerForm
            editing={editing}
            onSaved={handleSaved}
            onCancel={handleShowList}
          />
        )}

        {view === "detail" && selected && (
          <CustomerDetail customer={selected} onBack={handleShowList} />
        )}

        {view === "detail" && !selected && (
          <div className="card">Chưa chọn khách hàng.</div>
        )}
      </main>
    </div>
  );
}

// ================== DANH SÁCH ==================
function CustomerList({ customers, onSelect, onEdit, onExportExcel }) {
  const [keyword, setKeyword] = useState("");
  const EDIT_PASSWORD = "123456"; 
  const [canEdit, setCanEdit] = useState(false);

  const requireEditPassword = (onOk) => {
    if (canEdit) {
      onOk();
      return;
    }
    const input = window.prompt("Nhập mật khẩu để sửa phiếu:");
    if (input === EDIT_PASSWORD) {
      setCanEdit(true);
      onOk();
    } else if (input !== null) {
      alert("Mật khẩu không đúng.");
    }
  };

  const filtered = customers.filter((c) => {
    const kw = keyword.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(kw) ||
      c.phone.toLowerCase().includes(kw)
    );
  });

  return (
    <div className="card">
      {/* 1. NÚT BẤM (TRÊN CÙNG) */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
        <button className="btn btn-success btn-sm" onClick={onExportExcel}>
          Xuất Excel
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(null)}>
          + Thêm phiếu
        </button>
      </div>

      {/* 2. TIÊU ĐỀ (Ở GIỮA) */}
      <h2 className="list-title" style={{ marginTop: 0, textAlign: "center" }}>
        DANH SÁCH PHIẾU TƯ VẤN
      </h2>

      {/* 3. Ô TÌM KIẾM (DƯỚI TIÊU ĐỀ) */}
      <div className="search-wrapper" style={{ marginBottom: "20px", maxWidth: "100%" }}>
        <input
          className="form-input"
          placeholder="🔍 Tìm kiếm theo tên hoặc số điện thoại..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* 4. BẢNG DỮ LIỆU */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>SĐT</th>
              <th>Ngày ký</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => onSelect(c)} style={{ cursor: "pointer" }}>
                <td style={{ fontWeight: 500 }}>{c.fullName}</td>
                <td>{c.phone}</td>
                <td>{c.signDate ? formatDateDisplay(c.signDate) : "-"}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => requireEditPassword(() => onEdit(c))}
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: 30, color: "#6b7280" }}>
                  Không tìm thấy dữ liệu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ================== FORM PHIẾU ==================
function CustomerForm({ onSaved, onCancel, editing }) {
  const isEdit = !!editing;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initialForm = {
    supabaseId: null, id: null, fullName: "", dob: "", gender: "", phone: "", email: "", studentCode: "", major: "",
    currentIssues: [], skinType: "", historyAcneTreatment: "", historyAcneTreatmentNote: "",
    historyDoctorPrescription: "", historyDoctorPrescriptionNote: "", historyRetinoid: "", historyRetinoidNote: "",
    historyAllergy: "", historyAllergyNote: "", cleanserTimes: [], makeupRemoval: "", moisturizer: "", sunscreen: "",
    sleepWell: "", stress: "", waterIntake: "", spicySweet: "", productsUsing: "",
    faceForehead: [], faceBrow: [], faceNose: [], faceInnerCheek: [], faceOuterCheek: [], faceChin: [], faceJawline: [], faceNotes: "",
    goals: [], otherGoal: "", consentSkinCheck: "", consentTreatment: "", signDate: "", createdAt: "",
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (editing) {
      setForm((prev) => ({ ...prev, ...editing }));
    } else {
      setForm(initialForm);
    }
  }, [editing]);

  const currentIssueOptions = ["Mụn viêm", "Mụn đầu đen", "Mụn ẩn", "Thâm sau mụn", "Sẹo rỗ", "Da nhạy cảm", "Lỗ chân lông to", "Dầu nhiều", "Da khô", "Da xỉn màu", "Nám - Tàn nhang", "Không chắc chắn"];
  const skinTypeOptions = ["Da dầu", "Da khô", "Da hỗn hợp", "Da nhạy cảm", "Không rõ"];
  const foreheadOptions = ["Mụn ẩn", "Mụn viêm", "Dầu nhiều", "Khô", "Thâm", "Sẹo"];
  const browOptions = ["Mụn", "Mẩn đỏ", "Tắc nghẽn"];
  const noseOptions = ["Mụn đầu đen", "Mụn ẩn", "Lỗ chân lông to", "Dầu nhiều"];
  const innerCheekOptions = ["Nhạy cảm", "Đỏ da", "Mụn", "Sạm"];
  const outerCheekOptions = ["Sạm", "Nám", "Tàn nhang", "Tổn thương nắng"];
  const chinOptions = ["Mụn nội tiết", "Mụn viêm", "Mụn đầu trắng"];
  const jawOptions = ["Mụn nội tiết", "Mụn tiết dầu", "Mụn tái phát"];
  const goalOptions = ["Hết mụn", "Giảm thâm", "Hết bóng dầu", "Se khít lỗ chân lông", "Cải thiện sẹo/nám", "Da sáng khỏe", "Da đều màu", "Routine phù hợp sinh viên"];

  const toggleArrayField = (field, value) => {
    setForm((prev) => {
      const set = new Set(prev[field] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [field]: Array.from(set) };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.phone) {
      setError("Vui lòng nhập ít nhất Họ tên và SĐT.");
      return;
    }
    setSaving(true);

    const nowIso = new Date().toISOString();
    const mainIssues = (form.currentIssues || []).join(", ");
    const mainGoal = (form.goals || [])[0] || "";
    const localId = isEdit && form.id ? form.id : Date.now();
    const customer = { ...form, id: localId, createdAt: form.createdAt || nowIso, mainIssues, mainGoal };

    let supabaseError = null;
    let supabaseId = form.supabaseId || null;

    try {
      const payload = { full_name: customer.fullName, phone: customer.phone, main_issues: customer.mainIssues, main_goal: customer.mainGoal, data: customer };
      if (supabaseId) {
        const { error } = await supabase.from("phieu_tu_van").update(payload).eq("id", supabaseId);
        if (error) supabaseError = error;
      } else {
        const { data, error } = await supabase.from("phieu_tu_van").insert(payload).select().single();
        if (error) supabaseError = error;
        else if (data) supabaseId = data.id;
      }
    } catch (err) {
      supabaseError = err;
    }

    onSaved({ ...customer, supabaseId: supabaseId || form.supabaseId || null }, { isEdit });
    setSaving(false);
    if (supabaseError) alert("Đã lưu trên máy. Supabase lỗi: " + supabaseError.message);
    else alert("Đã lưu phiếu thành công.");
  };

  return (
    <>
      <div className="card no-print">
        <div className="card-header">
          <div className="card-title">{isEdit ? "CHỈNH SỬA PHIẾU" : "LẬP PHIẾU MỚI"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>HỦY</button>
            <button className="btn btn-primary btn-sm" type="submit" form="customer-form" disabled={saving}>
              {saving ? "ĐANG LƯU..." : "LƯU"}
            </button>
          </div>
        </div>
        {error && <div style={{ color: "#b91c1c", fontSize: 18, marginBottom: 4 }}>{error}</div>}
      </div>

      <form id="customer-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>1. THÔNG TIN CÁ NHÂN</h3>
          <div className="form-grid-2">
            <div>
              <label className="form-label">Họ và tên *</label>
              <input className="form-input" name="fullName" value={form.fullName} onChange={handleChange} />
              <label className="form-label" style={{ marginTop: 10 }}>Ngày sinh</label>
              <input type="date" className="form-input" name="dob" value={form.dob} onChange={handleChange} />
              <label className="form-label" style={{ marginTop: 10 }}>Giới tính</label>
              <div className="inline-options">
                {["Nam", "Nữ", "Khác"].map((g) => (
                  <label key={g}><input type="radio" name="gender" value={g} checked={form.gender === g} onChange={handleChange} />{g}</label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label" style={{ marginTop: 10 }}>SĐT</label>
              <input className="form-input" name="phone" value={form.phone} onChange={handleChange} />
              <label className="form-label" style={{ marginTop: 10 }}>Email</label>
              <input className="form-input" name="email" value={form.email} onChange={handleChange} />
            </div>
          </div>
          <div className="form-grid-2" style={{ marginTop: 10 }}>
            <div><label className="form-label">Mã số sinh viên</label><input className="form-input" name="studentCode" value={form.studentCode} onChange={handleChange} /></div>
            <div><label className="form-label">Khoa / Ngành học</label><input className="form-input" name="major" value={form.major} onChange={handleChange} /></div>
          </div>
        </div>

        <div className="form-section">
          <h3>2. TÌNH TRẠNG DA &amp; SỨC KHỎE</h3>
          <div className="form-label">Tình trạng da hiện tại</div>
          <div className="chip-group">
            {currentIssueOptions.map((issue) => (
              <button type="button" key={issue} className={"chip" + (form.currentIssues.includes(issue) ? " selected" : "")} onClick={() => toggleArrayField("currentIssues", issue)}>{issue}</button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}><div className="form-label">Loại da</div><div className="inline-options">{skinTypeOptions.map((t) => (<label key={t}><input type="radio" name="skinType" value={t} checked={form.skinType === t} onChange={handleChange} />{t}</label>))}</div></div>
          {/* Rút gọn các phần lịch sử để tiết kiệm chỗ hiển thị, logic giữ nguyên */}
          <div className="form-grid-2" style={{ marginTop: 10 }}>
             {/* ...Các phần history giữ nguyên logic như cũ... */}
             {/* Để tiết kiệm dòng trong câu trả lời này, tôi giữ nguyên logic map cũ của bạn cho History */}
             <div>
                <div className="form-label">Từng điều trị mụn?</div>
                <div className="inline-options">{["Chưa", "Rồi"].map((t) => (<label key={t}><input type="radio" name="historyAcneTreatment" value={t} checked={form.historyAcneTreatment === t} onChange={handleChange} />{t}</label>))}</div>
                {form.historyAcneTreatment === "Rồi" && <input className="form-input" name="historyAcneTreatmentNote" value={form.historyAcneTreatmentNote} onChange={handleChange} placeholder="Ghi chú..." style={{marginTop:5}} />}
             </div>
             <div>
                <div className="form-label">Thuốc bác sĩ kê?</div>
                <div className="inline-options">{["Chưa", "Rồi"].map((t) => (<label key={t}><input type="radio" name="historyDoctorPrescription" value={t} checked={form.historyDoctorPrescription === t} onChange={handleChange} />{t}</label>))}</div>
                {form.historyDoctorPrescription === "Rồi" && <input className="form-input" name="historyDoctorPrescriptionNote" value={form.historyDoctorPrescriptionNote} onChange={handleChange} placeholder="Ghi chú..." style={{marginTop:5}} />}
             </div>
             <div>
                <div className="form-label">Dùng Retinoids?</div>
                <div className="inline-options">{["Chưa", "Rồi"].map((t) => (<label key={t}><input type="radio" name="historyRetinoid" value={t} checked={form.historyRetinoid === t} onChange={handleChange} />{t}</label>))}</div>
                {form.historyRetinoid === "Rồi" && <input className="form-input" name="historyRetinoidNote" value={form.historyRetinoidNote} onChange={handleChange} placeholder="Ghi chú..." style={{marginTop:5}} />}
             </div>
             <div>
                <div className="form-label">Dị ứng mỹ phẩm?</div>
                <div className="inline-options">{["Không", "Có"].map((t) => (<label key={t}><input type="radio" name="historyAllergy" value={t} checked={form.historyAllergy === t} onChange={handleChange} />{t}</label>))}</div>
                {form.historyAllergy === "Có" && <input className="form-input" name="historyAllergyNote" value={form.historyAllergyNote} onChange={handleChange} placeholder="Ghi chú..." style={{marginTop:5}} />}
             </div>
          </div>
        </div>

        <div className="form-section">
          <h3>3. CHĂM SÓC &amp; SINH HOẠT</h3>
          <div className="form-grid-2">
            <div><div className="form-label">Sữa rửa mặt</div><div className="inline-options">{["Sáng", "Tối"].map((t) => (<label key={t}><input type="checkbox" checked={form.cleanserTimes.includes(t)} onChange={() => toggleArrayField("cleanserTimes", t)} />{t}</label>))}</div></div>
            <div><div className="form-label">Tẩy trang</div><div className="inline-options">{["Có", "Không"].map((t) => (<label key={t}><input type="radio" name="makeupRemoval" value={t} checked={form.makeupRemoval === t} onChange={handleChange} />{t}</label>))}</div></div>
            <div><div className="form-label">Kem dưỡng</div><div className="inline-options">{["Có", "Không"].map((t) => (<label key={t}><input type="radio" name="moisturizer" value={t} checked={form.moisturizer === t} onChange={handleChange} />{t}</label>))}</div></div>
            <div><div className="form-label">Chống nắng</div><div className="inline-options">{["Mỗi ngày", "Thỉnh thoảng", "Không"].map((t) => (<label key={t}><input type="radio" name="sunscreen" value={t} checked={form.sunscreen === t} onChange={handleChange} />{t}</label>))}</div></div>
            <div><div className="form-label">Ngủ đủ 7–8 tiếng</div><div className="inline-options">{["Có", "Không"].map((t) => (<label key={t}><input type="radio" name="sleepWell" value={t} checked={form.sleepWell === t} onChange={handleChange} />{t}</label>))}</div></div>
            <div><div className="form-label">Stress nhiều</div><div className="inline-options">{["Có", "Không"].map((t) => (<label key={t}><input type="radio" name="stress" value={t} checked={form.stress === t} onChange={handleChange} />{t}</label>))}</div></div>
            <div><div className="form-label">Lượng nước uống</div><div className="inline-options">{["<1L", "1–2L", ">2L"].map((t) => (<label key={t}><input type="radio" name="waterIntake" value={t} checked={form.waterIntake === t} onChange={handleChange} />{t}</label>))}</div></div>
            <div><div className="form-label">Ăn cay / ngọt</div><div className="inline-options">{["Có", "Không"].map((t) => (<label key={t}><input type="radio" name="spicySweet" value={t} checked={form.spicySweet === t} onChange={handleChange} />{t}</label>))}</div></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Sản phẩm đang dùng</label>
            <textarea className="form-textarea" name="productsUsing" value={form.productsUsing} onChange={handleChange} />
          </div>
        </div>

        <div className="form-section">
          <h3>4. FM - ĐÁNH GIÁ VÙNG MẶT</h3>
          <div className="face-map-grid">
            <FaceMapBlock label="Trán" options={foreheadOptions} selected={form.faceForehead} onToggle={(o) => toggleArrayField("faceForehead", o)} />
            <FaceMapBlock label="Giữa lông mày" options={browOptions} selected={form.faceBrow} onToggle={(o) => toggleArrayField("faceBrow", o)} />
            <FaceMapBlock label="Mũi" options={noseOptions} selected={form.faceNose} onToggle={(o) => toggleArrayField("faceNose", o)} />
            <FaceMapBlock label="Má trong" options={innerCheekOptions} selected={form.faceInnerCheek} onToggle={(o) => toggleArrayField("faceInnerCheek", o)} />
            <FaceMapBlock label="Má ngoài" options={outerCheekOptions} selected={form.faceOuterCheek} onToggle={(o) => toggleArrayField("faceOuterCheek", o)} />
            <FaceMapBlock label="Cằm" options={chinOptions} selected={form.faceChin} onToggle={(o) => toggleArrayField("faceChin", o)} />
            <FaceMapBlock label="Đường viền hàm" options={jawOptions} selected={form.faceJawline} onToggle={(o) => toggleArrayField("faceJawline", o)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Ghi chú thêm</label>
            <textarea className="form-textarea" name="faceNotes" value={form.faceNotes} onChange={handleChange} />
          </div>
        </div>

        <div className="form-section">
          <h3>5. MỤC TIÊU CẢI THIỆN DA</h3>
          <div className="chip-group">
            {goalOptions.map((g) => (
              <button key={g} type="button" className={"chip" + (form.goals.includes(g) ? " selected" : "")} onClick={() => toggleArrayField("goals", g)}>{g}</button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Khác</label>
            <input className="form-input" name="otherGoal" value={form.otherGoal} onChange={handleChange} />
          </div>
        </div>

        <div className="form-section">
          <h3>6. CAM KẾT &amp; ĐỒNG Ý</h3>
          <div className="inline-options">
            <label><input type="checkbox" checked={form.consentSkinCheck === "Đồng ý khảo sát da & soi da"} onChange={(e) => setForm((prev) => ({ ...prev, consentSkinCheck: e.target.checked ? "Đồng ý khảo sát da & soi da" : "" }))} />Đồng ý khảo sát da &amp; soi da</label>
          </div>
          <div className="inline-options" style={{ marginTop: 6 }}>
            <label><input type="checkbox" checked={form.consentTreatment === "Đồng ý tư vấn liệu trình"} onChange={(e) => setForm((prev) => ({ ...prev, consentTreatment: e.target.checked ? "Đồng ý tư vấn liệu trình" : "" }))} />Đồng ý tư vấn liệu trình</label>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Ngày ký phiếu</label>
            <input type="date" className="form-input" name="signDate" value={form.signDate} onChange={handleChange} />
          </div>
        </div>

        <div className="card no-print" style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>HỦY</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? "ĐANG LƯU..." : "LƯU PHIẾU"}</button>
          </div>
        </div>
      </form>
    </>
  );
}

function FaceMapBlock({ label, options, selected, onToggle }) {
  return (
    <div className="face-map-block">
      <div className="form-label">{label}</div>
      <div className="chip-group">
        {options.map((o) => (
          <button key={o} type="button" className={"chip" + (selected.includes(o) ? " selected" : "")} onClick={() => onToggle(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ================== CHI TIẾT / IN ==================
function CustomerDetail({ customer, onBack }) {
  const handlePrint = () => window.print();
  const join = (arr) => (arr && arr.length ? arr.join(", ") : "");

  return (
    <div className="card">
      {/* HEADER: ĐÃ XÓA "Lập lúc/SĐT", CHỈ CÒN NÚT */}
      <div className="detail-header-bar no-print" style={{ justifyContent: "flex-end" }}>
        <div className="print-actions">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← QUAY LẠI</button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>XUẤT PDF / IN</button>
        </div>
      </div>

      <h2 style={{ textAlign: "center", marginTop: 0, fontSize: 20 }}>PHIẾU THÔNG TIN TƯ VẤN DA</h2>
      <p style={{ textAlign: "center", fontSize: 18, marginTop: 0 }}>
        Thông tin bảo mật – chỉ sử dụng cho mục đích tư vấn &amp; chăm sóc da.
      </p>

      {/* 1 + 2 */}
      <div className="detail-two-column">
        <div className="detail-col">
          <SectionTitle label="1. THÔNG TIN CÁ NHÂN" />
          <div className="detail-row"><div className="detail-row-label">Họ và tên</div><div>{customer.fullName}</div></div>
          <div className="detail-row"><div className="detail-row-label">Ngày sinh</div><div>{formatDateDisplay(customer.dob)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Giới tính</div><div>{customer.gender}</div></div>
          <div className="detail-row"><div className="detail-row-label">SĐT</div><div>{customer.phone}</div></div>
          <div className="detail-row"><div className="detail-row-label">Email</div><div>{customer.email}</div></div>
          <div className="detail-row"><div className="detail-row-label">Mã số sinh viên</div><div>{customer.studentCode}</div></div>
          <div className="detail-row"><div className="detail-row-label">Khoa / Ngành học</div><div>{customer.major}</div></div>
        </div>

        <div className="detail-col">
          <SectionTitle label="2. TÌNH TRẠNG DA & SỨC KHỎE" />
          <div className="detail-row"><div className="detail-row-label">Hiện tại</div><div>{join(customer.currentIssues)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Loại da</div><div>{customer.skinType}</div></div>
          <div className="detail-row"><div className="detail-row-label">Điều trị mụn</div><div>{customer.historyAcneTreatment}</div></div>
          <div className="detail-row"><div className="detail-row-label">Thuốc bác sĩ</div><div>{customer.historyDoctorPrescription}</div></div>
          <div className="detail-row"><div className="detail-row-label">Retinoids</div><div>{customer.historyRetinoid}</div></div>
          <div className="detail-row"><div className="detail-row-label">Dị ứng</div><div>{customer.historyAllergy}</div></div>
        </div>
      </div>

      {/* 3 + 4 */}
      <div className="detail-two-column">
        <div className="detail-col">
          <SectionTitle label="3. CHĂM SÓC & SINH HOẠT" />
          <div className="detail-row"><div className="detail-row-label">Sữa rửa mặt</div><div>{join(customer.cleanserTimes)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Tẩy trang</div><div>{customer.makeupRemoval}</div></div>
          <div className="detail-row"><div className="detail-row-label">Kem dưỡng</div><div>{customer.moisturizer}</div></div>
          <div className="detail-row"><div className="detail-row-label">Chống nắng</div><div>{customer.sunscreen}</div></div>
          <div className="detail-row"><div className="detail-row-label">Ngủ đủ 7–8 tiếng</div><div>{customer.sleepWell}</div></div>
          <div className="detail-row"><div className="detail-row-label">Stress nhiều</div><div>{customer.stress}</div></div>
          <div className="detail-row"><div className="detail-row-label">Nước uống</div><div>{customer.waterIntake}</div></div>
          <div className="detail-row"><div className="detail-row-label">Cay / ngọt</div><div>{customer.spicySweet}</div></div>
          <div className="detail-row"><div className="detail-row-label">Sản phẩm</div><div>{customer.productsUsing}</div></div>
        </div>

        <div className="detail-col">
          <SectionTitle label="4. FM - ĐÁNH GIÁ VÙNG MẶT" />
          <div className="detail-row"><div className="detail-row-label">Trán</div><div>{join(customer.faceForehead)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Giữa lông mày</div><div>{join(customer.faceBrow)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Mũi</div><div>{join(customer.faceNose)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Má trong</div><div>{join(customer.faceInnerCheek)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Má ngoài</div><div>{join(customer.faceOuterCheek)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Cằm</div><div>{join(customer.faceChin)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Viền hàm</div><div>{join(customer.faceJawline)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Ghi chú</div><div>{customer.faceNotes}</div></div>
        </div>
      </div>

      {/* 5 + 6 */}
      <div className="detail-two-column">
        <div className="detail-col">
          <SectionTitle label="5. MỤC TIÊU CẢI THIỆN DA" />
          <div className="detail-row"><div className="detail-row-label">Mục tiêu</div><div>{join(customer.goals)}</div></div>
          <div className="detail-row"><div className="detail-row-label">Khác</div><div>{customer.otherGoal}</div></div>
        </div>

        <div className="detail-col">
          <SectionTitle label="6. CAM KẾT & ĐỒNG Ý" />
          <div className="detail-row"><div className="detail-row-label">Khảo sát &amp; soi da</div><div>{customer.consentSkinCheck}</div></div>
          <div className="detail-row"><div className="detail-row-label">Tư vấn liệu trình</div><div>{customer.consentTreatment}</div></div>
          <div className="detail-row"><div className="detail-row-label">Ngày ký phiếu</div><div>{formatDateDisplay(customer.signDate)}</div></div>
        </div>
      </div>

      <div className="signature-row">
        <div className="signature-block">
          <div>Khách hàng</div>
          <div style={{ fontStyle: "italic" }}>(Ký và ghi rõ họ tên)</div>
          <div className="signature-space" />
          <div>{customer.fullName}</div>
        </div>
        <div className="signature-block">
          <div>Tư vấn viên</div>
          <div style={{ fontStyle: "italic" }}>(Ký và ghi rõ họ tên)</div>
          <div className="signature-space" />
          <div>&nbsp;</div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label }) {
  return (
    <div style={{ fontWeight: 600, fontSize: 20, marginTop: 12, marginBottom: 6, borderLeft: "4px solid #103f6e", paddingLeft: 6 }}>
      {label}
    </div>
  );
}

export default App;