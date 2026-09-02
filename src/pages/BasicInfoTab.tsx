import React from 'react';
import { MapPin, Phone, User, Building, Navigation } from 'lucide-react';

export interface BasicInfoTabProps {
  schoolInfo: {
    name: string;
    address: string;
    area: string;
    phone: string;
    director: string;
    director_title?: string;
    latitude?: number | string;
    longitude?: number | string;
    school_size?: string;
    organize_domain?: string;
  };
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ schoolInfo }) => {
  // Parse lat and lng values correctly
  const rawLat = schoolInfo.latitude;
  const rawLng = schoolInfo.longitude;

  const lat = rawLat !== undefined && rawLat !== null && rawLat !== '' ? parseFloat(String(rawLat)) : NaN;
  const lng = rawLng !== undefined && rawLng !== null && rawLng !== '' ? parseFloat(String(rawLng)) : NaN;

  const hasValidCoordinates = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  return (
    <div className="w-full bg-slate-50 p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Map and Address */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-sky-800 flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5" /> ที่ตั้งโรงเรียน
          </h3>

          {/* Google Maps iFrame */}
          <div className="w-full h-64 bg-slate-200 rounded-md flex items-center justify-center text-gray-500 overflow-hidden relative border border-gray-200">
            {hasValidCoordinates ? (
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            ) : (
              <div className="text-center p-4">
                <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <span className="text-xs text-gray-500 font-medium">ไม่พบข้อมูลพิกัดละติจูด/ลองจิจูดสำหรับโรงเรียนนี้</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <h4 className="font-bold text-gray-800 text-sm mb-1">{schoolInfo.name}</h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-2">
              {schoolInfo.address || 'ไม่ระบุที่อยู่'}
            </p>
            <p className="text-xs font-bold text-sky-800 bg-sky-50 inline-block px-2.5 py-1 rounded border border-sky-100">
              {schoolInfo.area || schoolInfo.organize_domain || '-'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Director Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-sky-800 flex items-center gap-2 mb-4">
              <User className="w-5 h-5" /> ผู้บริหารสถานศึกษา
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold">
                <User className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">{schoolInfo.director || 'ไม่ระบุชื่อ'}</div>
                <div className="text-xs text-gray-500">{schoolInfo.director_title || 'ผู้อำนวยการโรงเรียน'}</div>
              </div>
            </div>
          </div>

          {/* School Attributes */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-sky-800 flex items-center gap-2 mb-4">
              <Building className="w-5 h-5" /> ข้อมูลประกอบสถานศึกษา
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex flex-col border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 mb-1">สังกัด / เขตพื้นที่</span>
                <span className="font-semibold text-gray-800">{schoolInfo.organize_domain || schoolInfo.area || '-'}</span>
              </div>

              <div className="flex flex-col border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 mb-1">ขนาดโรงเรียน</span>
                <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 inline-block w-max">
                  {schoolInfo.school_size ? `ขนาด${schoolInfo.school_size}` : 'ไม่ระบุ'}
                </span>
              </div>

              <div className="flex flex-col border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-sky-600" /> เบอร์โทรศัพท์
                </span>
                <span className="font-semibold text-gray-800">{schoolInfo.phone || '-'}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-sky-600" /> พิกัด GPS
                </span>
                <span className="font-mono font-semibold text-gray-800">
                  {hasValidCoordinates ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'ไม่ระบุพิกัด'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};