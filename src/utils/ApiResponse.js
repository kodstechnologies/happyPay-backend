class ApiResponse {
    constructor({ success, statusCode = 200, message = 'Success', data = null, meta = null } = {}) {
      this.success = Boolean(success);
      this.statusCode = statusCode;
      this.message = message;
      this.data = data;
      this.meta = meta;
    }
  
    static success(data = null, message = 'Success', meta = null, statusCode = 200) {
      return new ApiResponse({ success: true, statusCode, message, data, meta });
    }
  
    static error(message = 'Error', data = null, meta = null, statusCode = 400) {
      return new ApiResponse({ success: false, statusCode, message, data, meta });
    }
  }
  
  export { ApiResponse };
  export default ApiResponse;
  