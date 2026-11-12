import type { HubCreateApi } from '../api/adminOperationsApi';

/** Optional form presets from HUONG_DAN_FE_ADMIN_THEM_HUB_MOI (12/11/2026).
 * They never create hubs automatically; Admin reviews and submits each hub. */
export const hubCreationPresets: HubCreateApi[] = [
  {
    code: 'HUB-NHABE', name: 'Hub Nhà Bè',
    address: 'Đường Nguyễn Hữu Thọ, KĐT Hiệp Phước, Xã Nhà Bè, TP.HCM',
    area: 'TP.HCM', latitude: 10.668, longitude: 106.742, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-BINHKHANH', name: 'Hub Bình Khánh',
    address: 'Đường Rừng Sác, Cửa ngõ Phà Bình Khánh, Xã Bình Khánh, TP.HCM',
    area: 'TP.HCM', latitude: 10.618, longitude: 106.798, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-ANTHOIDONG', name: 'Hub An Thới Đông',
    address: 'Đường An Thới Đông, Xã An Thới Đông, TP.HCM',
    area: 'TP.HCM', latitude: 10.528, longitude: 106.872, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-LONGHOA', name: 'Hub Long Hòa',
    address: 'Đường Duyên Hải, Khu vực Long Hòa, Xã Cần Giờ, TP.HCM',
    area: 'TP.HCM', latitude: 10.445, longitude: 106.925, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-CANTHANH', name: 'Hub Cần Thạnh',
    address: 'Đường Tắc Xuất, Khu vực Cần Thạnh, Xã Cần Giờ, TP.HCM',
    area: 'TP.HCM', latitude: 10.405, longitude: 106.975, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-VUNGTAU', name: 'Hub Vũng Tàu',
    address: 'Đường Trần Phú, Khu Bến Đá, Phường Vũng Tàu, TP.HCM',
    area: 'TP.HCM', latitude: 10.372, longitude: 107.062, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-TAMTHANG', name: 'Hub Tam Thắng',
    address: '603 Nguyễn An Ninh, Phường Tam Thắng, TP.HCM',
    area: 'TP.HCM', latitude: 10.398, longitude: 107.125, capacity: 24, status: 'Active',
  },
  {
    code: 'HUB-BARIA', name: 'Hub Bà Rịa',
    address: '137 Đường 27/4, Phường Bà Rịa, TP.HCM',
    area: 'TP.HCM', latitude: 10.495, longitude: 107.168, capacity: 24, status: 'Active',
  },
];
