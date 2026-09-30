// src/containers/Patient/DoctorExtraInfo.jsx
// Thông Tin Phòng Khám & Giá Khám — SRS 3.8 (REQ-PT-010, 011)
// Hỗ trợ 2 cách nhận dữ liệu:
//   A. props.extraInfo  — DoctorDetail truyền trực tiếp (tối ưu, không gọi API thừa)
//   B. props.doctorId   — SpecialtyDetail/ClinicDetail truyền, tự fetch API

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { getDoctorDetail } from '../../services/doctorService';
import { LANGUAGES } from '../../utils/constants';
import './DoctorExtraInfo.scss';

const DoctorExtraInfo = ({ extraInfo: extraInfoProp, doctorId, selectedPractice }) => {
  const language = useSelector((state) => state.app.language);
  const [showPriceDetail, setShowPriceDetail] = useState(false);
  const [fetchedInfo, setFetchedInfo] = useState(null);

  // Nếu KHÔNG nhận extraInfo qua props mà nhận doctorId → tự fetch
  useEffect(() => {
    if (extraInfoProp || !doctorId) return; // Đã có props → skip

    const fetchExtraInfo = async () => {
      try {
        const res = await getDoctorDetail(doctorId);
        if (res && res.errCode === 0 && res.data && res.data.Doctor_Info) {
          setFetchedInfo(res.data.Doctor_Info);
        }
      } catch (err) {
      }
    };

    fetchExtraInfo();
  }, [doctorId, extraInfoProp]);

  // Ưu tiên: props → fetched
  const extraInfo = extraInfoProp || fetchedInfo;

  // Nếu chưa có dữ liệu và không có selectedPractice → không render
  if (!extraInfo && !selectedPractice) return null;

  const clinicName = selectedPractice?.clinicData?.name || extraInfo?.clinicData?.name || '';
  const clinicAddress = selectedPractice?.clinicData?.address || extraInfo?.clinicData?.address || '';
  const roomNumber = selectedPractice?.roomNumber || '';
  const priceValue =
    (language === LANGUAGES.VI
      ? selectedPractice?.priceTypeData?.valueVi
      : selectedPractice?.priceTypeData?.valueEn) ||
    (language === LANGUAGES.VI
      ? extraInfo?.priceData?.valueVi
      : extraInfo?.priceData?.valueEn) ||
    '';

  return (
    <div className="doctor-extra-info" id="doctor-extra-info">
      {/* ===== ĐỊA CHỈ KHÁM (REQ-PT-011) ===== */}
      <div className="doctor-extra-info__section">
        <h3 className="doctor-extra-info__label">
          <FormattedMessage id="patient.doctor-detail.clinic-address" />
        </h3>
        {clinicName && (
          <>
            <p className="doctor-extra-info__clinic-name">
              {clinicName}
            </p>
            {roomNumber && (
              <p className="doctor-extra-info__clinic-room" style={{ color: '#087f8c', fontWeight: 600, fontSize: '0.85rem', margin: '2px 0 4px' }}>
                <i className="fas fa-door-open" style={{ marginRight: 6 }}></i>
                {language === LANGUAGES.VI ? 'Phòng khám: ' : 'Room: '}
                {roomNumber}
              </p>
            )}
            <p className="doctor-extra-info__clinic-address">
              {clinicAddress}
            </p>
          </>
        )}
      </div>

      {/* ===== GIÁ KHÁM (REQ-PT-010) ===== */}
      <div className="doctor-extra-info__section">
        <h3 className="doctor-extra-info__label">
          <FormattedMessage id="doctor.price" />
        </h3>

        {/* Chế độ thu gọn — chỉ hiện giá */}
        {!showPriceDetail ? (
          <div className="doctor-extra-info__price-row">
            <span className="doctor-extra-info__price-value">
              {priceValue}
            </span>
            <span
              className="doctor-extra-info__toggle"
              onClick={() => setShowPriceDetail(true)}
            >
              <FormattedMessage id="patient.doctor-detail.see-detail" />
            </span>
          </div>
        ) : (
          /* Chế độ mở rộng — hiện chi tiết giá + thanh toán */
          <div className="doctor-extra-info__price-detail">
            <div className="doctor-extra-info__price-detail-box">
              <div className="doctor-extra-info__price-detail-row">
                <span>
                  {language === LANGUAGES.VI ? 'Giá khám' : 'Examination price'}
                </span>
                <span className="doctor-extra-info__price-bold">
                  {priceValue}
                </span>
              </div>
              {extraInfo?.note && (
                <p className="doctor-extra-info__note">{extraInfo.note}</p>
              )}
            </div>

            <div className="doctor-extra-info__payment">
              <span>
                <FormattedMessage id="patient.doctor-detail.payment" />:{' '}
              </span>
              <span>
                {language === LANGUAGES.VI
                  ? extraInfo.paymentData?.valueVi
                  : extraInfo.paymentData?.valueEn}
              </span>
            </div>

            <span
              className="doctor-extra-info__toggle"
              onClick={() => setShowPriceDetail(false)}
            >
              <FormattedMessage id="patient.doctor-detail.hide-detail" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorExtraInfo;
