// Mirrors the envelope every Drone-BE endpoint returns
// (see app/common/response.py in the backend project).
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
