

type ApiConfig = {
  baseUrl: string;
  token?: string;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string>;
  body?: any;
};

const makeApiRequester = (config: ApiConfig) => {
  const request = async (path: string, options: RequestOptions = {}) => {
    const { method = 'GET', params, body } = options;
    const url = new URL(`${config.baseUrl}${path}`);

    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const headers = new Headers({
      'Accept': 'application/json',
    });

    if (config.token) {
      headers.append('Authorization', `Bearer ${config.token}`);
    }

    if (body) {
      headers.append('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses (common for DELETE operations)
      if (response.status === 204) {
        return null;
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('❌ Network or other error:', error);
      throw error;
    }
  };

  return {
    get: (path: string, params?: Record<string, string>) => request(path, { params }),
    post: (path: string, body: any) => request(path, { method: 'POST', body }),
    put: (path: string, body: any) => request(path, { method: 'PUT', body }),
    delete: (path: string) => request(path, { method: 'DELETE' }),
  };
};

export { makeApiRequester, type ApiConfig };
