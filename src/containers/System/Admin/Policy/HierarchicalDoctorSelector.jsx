// src/containers/System/Admin/Policy/HierarchicalDoctorSelector.jsx
// Bộ chọn Bác sĩ Phân cấp 2 Cột (Hierarchical 2-Pane Selector): Cơ sở -> Chuyên khoa -> Bác sĩ
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Building,
  Stethoscope,
  User,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
  Check,
  Minus,
  Users,
  AlertCircle
} from 'lucide-react';
import { getAdminDoctorHierarchyTree } from '../../../../services/policyService';
import './HierarchicalDoctorSelector.scss';

// Tri-state checkbox helper component
const TriStateCheckbox = ({ checked, indeterminate, onChange, disabled = false }) => {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = !checked && indeterminate;
    }
  }, [checked, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={checkboxRef}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="hierarchical-checkbox"
    />
  );
};

const HierarchicalDoctorSelector = ({ selectedDoctors = [], onChange }) => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClinics, setExpandedClinics] = useState(new Set());
  const [expandedSpecialties, setExpandedSpecialties] = useState(new Set());

  // Tải cây dữ liệu từ backend
  useEffect(() => {
    let isMounted = true;
    const loadTree = async () => {
      try {
        setLoading(true);
        const res = await getAdminDoctorHierarchyTree();
        if (res?.data && isMounted) {
          setTreeData(res.data);
          // Mặc định mở rộng cơ sở y tế đầu tiên
          if (res.data.length > 0) {
            setExpandedClinics(new Set([res.data[0].id]));
            if (res.data[0].specialties?.length > 0) {
              setExpandedSpecialties(new Set([`${res.data[0].id}_${res.data[0].specialties[0].id}`]));
            }
          }
        }
      } catch (err) {
        console.error('Error loading doctor hierarchy tree:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadTree();
    return () => { isMounted = false; };
  }, []);

  // Map kiểm tra nhanh bác sĩ đã chọn
  const selectedKeysSet = useMemo(() => {
    const set = new Set();
    selectedDoctors.forEach((d) => {
      // Key duy nhất theo assignmentId hoặc doctorId_clinicId
      set.add(`${d.doctorId}_${d.clinicId}`);
    });
    return set;
  }, [selectedDoctors]);

  // Lọc tìm kiếm theo từ khóa
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return treeData;
    const term = searchTerm.toLowerCase();

    return treeData
      .map((clinic) => {
        const clinicMatch = clinic.name.toLowerCase().includes(term);

        const filteredSpecs = clinic.specialties
          .map((spec) => {
            const specMatch = spec.name.toLowerCase().includes(term);

            const filteredDocs = spec.doctors.filter((doc) => {
              return (
                clinicMatch ||
                specMatch ||
                doc.fullName.toLowerCase().includes(term) ||
                (doc.email && doc.email.toLowerCase().includes(term)) ||
                (doc.roomNumber && doc.roomNumber.toLowerCase().includes(term))
              );
            });

            if (clinicMatch || specMatch || filteredDocs.length > 0) {
              return {
                ...spec,
                doctors: filteredDocs
              };
            }
            return null;
          })
          .filter(Boolean);

        if (clinicMatch || filteredSpecs.length > 0) {
          return {
            ...clinic,
            specialties: filteredSpecs
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [treeData, searchTerm]);

  // Tự động mở rộng khi tìm kiếm
  useEffect(() => {
    if (searchTerm.trim() && filteredTree.length > 0) {
      const newExpClinics = new Set();
      const newExpSpecs = new Set();
      filteredTree.forEach((c) => {
        newExpClinics.add(c.id);
        c.specialties.forEach((s) => {
          newExpSpecs.add(`${c.id}_${s.id}`);
        });
      });
      setExpandedClinics(newExpClinics);
      setExpandedSpecialties(newExpSpecs);
    }
  }, [searchTerm, filteredTree]);

  // Toggle thu gọn / mở rộng cơ sở
  const toggleClinicExpand = (clinicId) => {
    setExpandedClinics((prev) => {
      const next = new Set(prev);
      if (next.has(clinicId)) next.delete(clinicId);
      else next.add(clinicId);
      return next;
    });
  };

  // Toggle thu gọn / mở rộng chuyên khoa
  const toggleSpecialtyExpand = (key) => {
    setExpandedSpecialties((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle chọn một bác sĩ cụ thể
  const handleToggleDoctor = (doc) => {
    const key = `${doc.doctorId}_${doc.clinicId}`;
    let newSelected;
    if (selectedKeysSet.has(key)) {
      newSelected = selectedDoctors.filter((d) => `${d.doctorId}_${d.clinicId}` !== key);
    } else {
      newSelected = [
        ...selectedDoctors,
        {
          assignmentId: doc.assignmentId,
          doctorId: doc.doctorId,
          fullName: doc.fullName,
          positionVi: doc.positionVi,
          email: doc.email,
          phone: doc.phone,
          image: doc.image,
          roomNumber: doc.roomNumber,
          clinicId: doc.clinicId,
          clinicName: doc.clinicName,
          specialtyId: doc.specialtyId,
          specialtyName: doc.specialtyName
        }
      ];
    }
    onChange(newSelected);
  };

  // Toggle chọn toàn bộ bác sĩ trong chuyên khoa
  const handleToggleSpecialty = (specDoctors) => {
    const allDocKeys = specDoctors.map((d) => `${d.doctorId}_${d.clinicId}`);
    const allSelected = allDocKeys.every((k) => selectedKeysSet.has(k));

    let newSelected;
    if (allSelected) {
      // Bỏ chọn tất cả bác sĩ trong khoa này
      const keysToRemove = new Set(allDocKeys);
      newSelected = selectedDoctors.filter((d) => !keysToRemove.has(`${d.doctorId}_${d.clinicId}`));
    } else {
      // Thêm những bác sĩ chưa có
      const toAdd = specDoctors.filter((d) => !selectedKeysSet.has(`${d.doctorId}_${d.clinicId}`)).map((doc) => ({
        assignmentId: doc.assignmentId,
        doctorId: doc.doctorId,
        fullName: doc.fullName,
        positionVi: doc.positionVi,
        email: doc.email,
        phone: doc.phone,
        image: doc.image,
        roomNumber: doc.roomNumber,
        clinicId: doc.clinicId,
        clinicName: doc.clinicName,
        specialtyId: doc.specialtyId,
        specialtyName: doc.specialtyName
      }));
      newSelected = [...selectedDoctors, ...toAdd];
    }
    onChange(newSelected);
  };

  // Toggle chọn toàn bộ bác sĩ trong cơ sở y tế
  const handleToggleClinic = (clinic) => {
    const allClinicDocs = [];
    clinic.specialties.forEach((s) => {
      s.doctors.forEach((d) => allClinicDocs.push(d));
    });

    const allKeys = allClinicDocs.map((d) => `${d.doctorId}_${d.clinicId}`);
    const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeysSet.has(k));

    let newSelected;
    if (allSelected) {
      const keysToRemove = new Set(allKeys);
      newSelected = selectedDoctors.filter((d) => !keysToRemove.has(`${d.doctorId}_${d.clinicId}`));
    } else {
      const toAdd = allClinicDocs.filter((d) => !selectedKeysSet.has(`${d.doctorId}_${d.clinicId}`)).map((doc) => ({
        assignmentId: doc.assignmentId,
        doctorId: doc.doctorId,
        fullName: doc.fullName,
        positionVi: doc.positionVi,
        email: doc.email,
        phone: doc.phone,
        image: doc.image,
        roomNumber: doc.roomNumber,
        clinicId: doc.clinicId,
        clinicName: doc.clinicName,
        specialtyId: doc.specialtyId,
        specialtyName: doc.specialtyName
      }));
      newSelected = [...selectedDoctors, ...toAdd];
    }
    onChange(newSelected);
  };

  // Xóa toàn bộ danh sách đã chọn
  const handleClearAll = () => {
    onChange([]);
  };

  // Xóa một bác sĩ khỏi danh sách đã chọn bên phải
  const handleRemoveDoctor = (docKey) => {
    onChange(selectedDoctors.filter((d) => `${d.doctorId}_${d.clinicId}` !== docKey));
  };

  return (
    <div className="hierarchical-doctor-selector">
      {/* CỘT TRÁI: CÂY PHÂN CẤP & TÌM KIẾM (60%) */}
      <div className="selector-left-pane">
        <div className="pane-header">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo Bác sĩ, Cơ sở y tế, Chuyên khoa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="tree-scroll-container">
          {loading ? (
            <div className="tree-loading">
              <div className="spinner-border spinner-border-sm text-teal-600" role="status" />
              <span>Đang tải danh sách phân cấp bác sĩ...</span>
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="tree-empty">
              <AlertCircle size={24} className="text-gray-400" />
              <span>Không tìm thấy bác sĩ hoặc cơ sở y tế nào phù hợp.</span>
            </div>
          ) : (
            <div className="tree-root">
              {filteredTree.map((clinic) => {
                const isClinicExpanded = expandedClinics.has(clinic.id);

                // Tính toán trạng thái checkbox của clinic
                const allClinicDocs = [];
                clinic.specialties.forEach((s) => s.doctors.forEach((d) => allClinicDocs.push(d)));
                const selectedInClinicCount = allClinicDocs.filter((d) =>
                  selectedKeysSet.has(`${d.doctorId}_${d.clinicId}`)
                ).length;

                const isClinicChecked = allClinicDocs.length > 0 && selectedInClinicCount === allClinicDocs.length;
                const isClinicIndeterminate = selectedInClinicCount > 0 && selectedInClinicCount < allClinicDocs.length;

                return (
                  <div key={clinic.id} className="tree-node tree-node--clinic">
                    <div className="tree-row clinic-row">
                      <button
                        type="button"
                        className="expand-btn"
                        onClick={() => toggleClinicExpand(clinic.id)}
                      >
                        {isClinicExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <TriStateCheckbox
                        checked={isClinicChecked}
                        indeterminate={isClinicIndeterminate}
                        onChange={() => handleToggleClinic(clinic)}
                      />

                      <div className="node-content" onClick={() => toggleClinicExpand(clinic.id)}>
                        <Building size={16} className="node-icon clinic-icon" />
                        <span className="node-title clinic-name">{clinic.name}</span>
                        <span className="node-badge">
                          ({selectedInClinicCount}/{allClinicDocs.length})
                        </span>
                      </div>
                    </div>

                    {isClinicExpanded && (
                      <div className="tree-children clinic-children">
                        {clinic.specialties.map((spec) => {
                          const specKey = `${clinic.id}_${spec.id}`;
                          const isSpecExpanded = expandedSpecialties.has(specKey);

                          const selectedInSpecCount = spec.doctors.filter((d) =>
                            selectedKeysSet.has(`${d.doctorId}_${d.clinicId}`)
                          ).length;

                          const isSpecChecked =
                            spec.doctors.length > 0 && selectedInSpecCount === spec.doctors.length;
                          const isSpecIndeterminate =
                            selectedInSpecCount > 0 && selectedInSpecCount < spec.doctors.length;

                          return (
                            <div key={spec.id} className="tree-node tree-node--specialty">
                              <div className="tree-row specialty-row">
                                <button
                                  type="button"
                                  className="expand-btn"
                                  onClick={() => toggleSpecialtyExpand(specKey)}
                                >
                                  {isSpecExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>

                                <TriStateCheckbox
                                  checked={isSpecChecked}
                                  indeterminate={isSpecIndeterminate}
                                  onChange={() => handleToggleSpecialty(spec.doctors)}
                                />

                                <div className="node-content" onClick={() => toggleSpecialtyExpand(specKey)}>
                                  <Stethoscope size={14} className="node-icon specialty-icon" />
                                  <span className="node-title specialty-name">{spec.name}</span>
                                  <span className="node-badge">
                                    ({selectedInSpecCount}/{spec.doctors.length})
                                  </span>
                                </div>
                              </div>

                              {isSpecExpanded && (
                                <div className="tree-children specialty-children">
                                  {spec.doctors.map((doc) => {
                                    const docKey = `${doc.doctorId}_${doc.clinicId}`;
                                    const isDocChecked = selectedKeysSet.has(docKey);

                                    return (
                                      <div
                                        key={doc.assignmentId || docKey}
                                        className={`tree-row doctor-row ${isDocChecked ? 'doctor-row--selected' : ''}`}
                                        onClick={() => handleToggleDoctor(doc)}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isDocChecked}
                                          onChange={() => handleToggleDoctor(doc)}
                                          className="hierarchical-checkbox"
                                          onClick={(e) => e.stopPropagation()}
                                        />

                                        <div className="doctor-avatar-wrap">
                                          {doc.image ? (
                                            <img src={doc.image} alt={doc.fullName} className="doc-avatar-img" />
                                          ) : (
                                            <div className="doc-avatar-placeholder">
                                              <User size={13} />
                                            </div>
                                          )}
                                        </div>

                                        <div className="doctor-info-text">
                                          <div className="doc-name">
                                            {doc.positionVi ? `${doc.positionVi} ` : 'BS. '}
                                            {doc.fullName}
                                          </div>
                                          <div className="doc-meta">
                                            {doc.roomNumber ? `${doc.roomNumber} • ` : ''}
                                            {doc.email || 'Bác sĩ chuyên khoa'}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: DANH SÁCH BÁC SĨ ĐÃ CHỌN (40%) */}
      <div className="selector-right-pane">
        <div className="selected-header">
          <div className="header-title-box">
            <Users size={16} className="text-teal-600" />
            <span className="header-title">Đã chọn:</span>
            <span className="selected-count-badge">{selectedDoctors.length}</span>
            <span className="header-subtitle">bác sĩ</span>
          </div>

          {selectedDoctors.length > 0 && (
            <button
              type="button"
              className="clear-all-btn"
              onClick={handleClearAll}
              title="Xóa toàn bộ lựa chọn"
            >
              <Trash2 size={13} />
              <span>Xóa sạch</span>
            </button>
          )}
        </div>

        <div className="selected-scroll-container">
          {selectedDoctors.length === 0 ? (
            <div className="selected-empty">
              <div className="empty-icon-wrap">
                <Users size={28} className="text-gray-300" />
              </div>
              <p className="empty-title">Chưa có bác sĩ nào được chọn</p>
              <p className="empty-desc">
                Chọn các Bác sĩ, Chuyên khoa hoặc toàn bộ Cơ sở y tế từ danh mục phân cấp bên trái.
              </p>
            </div>
          ) : (
            <div className="selected-list">
              {selectedDoctors.map((doc) => {
                const docKey = `${doc.doctorId}_${doc.clinicId}`;
                return (
                  <div key={docKey} className="selected-doctor-card">
                    <div className="card-avatar">
                      {doc.image ? (
                        <img src={doc.image} alt={doc.fullName} />
                      ) : (
                        <div className="avatar-fallback">
                          <User size={14} />
                        </div>
                      )}
                    </div>

                    <div className="card-body">
                      <div className="card-name">
                        {doc.positionVi ? `${doc.positionVi} ` : 'BS. '}
                        {doc.fullName}
                      </div>
                      <div className="card-meta">
                        <span className="clinic-tag">{doc.clinicName}</span>
                        <span className="spec-tag">• {doc.specialtyName}</span>
                        {doc.roomNumber && <span className="room-tag">• {doc.roomNumber}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="remove-doc-btn"
                      onClick={() => handleRemoveDoctor(docKey)}
                      title={`Bỏ chọn ${doc.fullName}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HierarchicalDoctorSelector;
