import { Controller, Get, Post, Put, Delete, Res, Req, Param, UseGuards } from '@nestjs/common';
import { RequirePermission, RequireAnyPermission, RequireAllPermissions } from './permission.decorator';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * 權限測試控制器
 * 示範如何使用新的權限系統
 * 
 * 注意：這是測試用的控制器，實際使用時請移除或重新命名
 */
@Controller('permission-test')
export class PermissionTestController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  /**
   * 示範：單一權限檢查
   * 只有具備 'users.view' 權限的角色可以存取
   */
  @RequirePermission('users.view')
  @Get('users')
  getUsers() {
    return {
      message: '成功存取用戶列表',
      requiredPermission: 'users.view'
    };
  }

  /**
   * 示範：單一權限檢查
   * 只有具備 'users.create' 權限的角色可以存取
   */
  @RequirePermission('users.create')
  @Post('users')
  createUser() {
    return {
      message: '成功創建用戶',
      requiredPermission: 'users.create'
    };
  }

  /**
   * 示範：任一權限檢查
   * 具備 'agents.view' 或 'users.view' 其中任一權限即可存取
   */
  @RequireAnyPermission(['agents.view', 'users.view'])
  @Get('dashboard')
  getDashboard() {
    return {
      message: '成功存取儀表板',
      requiredPermissions: 'agents.view 或 users.view (任一)'
    };
  }

  /**
   * 示範：所有權限檢查
   * 必須同時具備 'users.view' 和 'agents.view' 權限
   */
  @RequireAllPermissions(['users.view', 'agents.view'])
  @Get('admin-panel')
  getAdminPanel() {
    return {
      message: '成功存取管理面板',
      requiredPermissions: 'users.view 和 agents.view (全部)'
    };
  }

  /**
   * 示範：高權限功能
   * 只有系統管理員可以存取
   */
  @RequirePermission('system.maintenance')
  @Delete('system/reset')
  resetSystem() {
    return {
      message: '系統重置操作',
      requiredPermission: 'system.maintenance'
    };
  }

  /**
   * 示範：無權限限制
   * 任何已登入用戶都可以存取
   */
  @Get('public')
  getPublicInfo() {
    return {
      message: '這是公開資訊，無需特殊權限',
      requiredPermission: '無'
    };
  }

  /**
   * 調試用端點 - 顯示當前用戶資訊 (不強制 JWT 驗證)
   */
  @Get('debug-user')
  getDebugUser(@Req() req: any) {
    const authHeader = req.headers.authorization;
    const hasToken = !!authHeader;
    
    return {
      message: '調試用戶資訊',
      hasAuthHeader: hasToken,
      authHeader: authHeader ? authHeader.substring(0, 30) + '...' : null,
      user: req.user || null,
      timestamp: new Date().toISOString(),
      note: '這個端點不強制 JWT 驗證，所以 req.user 可能為 null'
    };
  }

  /**
   * 調試用端點 - 顯示當前用戶資訊 (強制 JWT 驗證)
   */
  @UseGuards(JwtAuthGuard)
  @Get('debug-user-jwt')
  getDebugUserWithJWT(@Req() req: any) {
    const user = req.user;
    return {
      message: '當前用戶資訊',
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role,
        companyId: user.companyId
      } : null,
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : null,
      rawUser: user, // 完整的用戶物件
      requestHeaders: {
        authorization: req.headers.authorization,
        'user-agent': req.headers['user-agent']
      }
    };
  }

  /**
   * 不需要權限的調試端點 - 用來測試 JWT 解析
   */
  @Get('debug-jwt')
  async getDebugJWT(@Req() req: any) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return { error: '沒有 Authorization header' };
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      // 手動解析 JWT (不驗證簽名)
      const [header, payload] = token.split('.');
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      return {
        message: '手動解析 JWT',
        token: token.substring(0, 20) + '...',
        payload: decodedPayload,
        hasUser: !!req.user,
        userInfo: req.user
      };
    } catch (error) {
      return {
        error: 'JWT 解析失敗',
        details: error.message
      };
    }
  }

  /**
   * 測試資料庫用戶查詢
   */
  @Get('debug-db/:userId')
  async getDebugDB(@Param('userId') userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: parseInt(userId) },
        relations: ['company'],
      });

      return {
        message: '資料庫查詢測試',
        userId: parseInt(userId),
        userFound: !!user,
        user: user ? {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          companyId: user.company?.id,
          companyCode: user.company?.code
        } : null
      };
    } catch (error) {
      return {
        error: '資料庫查詢失敗',
        details: error.message
      };
    }
  }

  /**
   * 簡單測試端點 - 確認控制器運作正常
   */
  @Get('hello')
  getHello() {
    return {
      message: '權限測試控制器正常運作！',
      time: new Date().toISOString(),
      endpoints: [
        'GET /permission-test/hello - 這個端點',
        'GET /permission-test/page - 測試頁面',
        'GET /permission-test/public - 公開測試',
        'GET /permission-test/users - 需要 users.view 權限',
        'POST /permission-test/users - 需要 users.create 權限'
      ]
    };
  }

  /**
   * 提供測試頁面 HTML
   * 直接在 /permission-test/page 訪問
   */
  @Get('page')
  getTestPage(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>權限系統測試</title>
    <style>
        body {
            font-family: 'Microsoft JhengHei', sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .login-section {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .test-button {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .test-button:hover {
            background: #1976D2;
        }
        .test-button.danger {
            background: #f44336;
        }
        .test-button.success {
            background: #4CAF50;
        }
        .result {
            margin-top: 15px;
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
            font-family: monospace;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .result.info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }
        input, button {
            padding: 10px;
            margin: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .status {
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .status.logged-in {
            background: #d4edda;
            color: #155724;
        }
        .status.logged-out {
            background: #f8d7da;
            color: #721c24;
        }
        .permission-info {
            font-size: 0.9em;
            color: #666;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 權限系統測試</h1>
        
        <div class="result info">
            <strong>📋 測試說明：</strong><br>
            • 這是新權限配置系統的測試頁面<br>
            • 用來驗證基於配置的權限檢查功能<br>
            • 建議使用管理員帳號進行完整測試
        </div>
        
        <!-- 登入狀態 -->
        <div id="loginStatus" class="status logged-out">❌ 未登入</div>

        <!-- 登入區域 -->
        <div class="login-section">
            <h2>🚪 登入測試</h2>
            <div>
                <input type="text" id="username" placeholder="用戶名">
                <input type="password" id="password" placeholder="密碼">
                <button onclick="login()" class="test-button">登入</button>
                <button onclick="logout()" class="test-button" style="background: #ff9800;">登出</button>
            </div>
            <div id="loginResult" style="display: none;"></div>
        </div>

        <!-- 權限測試 -->
        <div>
            <h2>🧪 權限功能測試</h2>
            
            <h3>調試測試</h3>
            <button onclick="testEndpoint('GET', '/permission-test/debug-user')" class="test-button" style="background: #9c27b0;">
                調試用戶資訊
            </button>
            <div class="permission-info">🔍 檢查當前登入狀態和 Token</div>
            
            <button onclick="testEndpoint('GET', '/permission-test/debug-jwt')" class="test-button" style="background: #ff5722;">
                調試 JWT 解析
            </button>
            <div class="permission-info">🔧 手動解析 JWT Token 內容</div>
            
            <button onclick="testEndpoint('GET', '/permission-test/debug-user-jwt')" class="test-button" style="background: #8bc34a;">
                調試 JWT 驗證
            </button>
            <div class="permission-info">🔐 強制觸發 JWT Strategy 驗證</div>
            <br>

            <h3>基本權限測試</h3>
            <button onclick="testEndpoint('GET', '/permission-test/public')" class="test-button success">
                公開端點 (無限制)
            </button>
            <div class="permission-info">✅ 任何人都可存取</div>
            <br>
            
            <button onclick="testEndpoint('GET', '/permission-test/users')" class="test-button">
                用戶列表 (users.view)
            </button>
            <div class="permission-info">需要: SUPER_ADMIN, GLOBAL_ADMIN, AGENT_LEVEL_1, AGENT_LEVEL_2</div>
            <br>
            
            <button onclick="testEndpoint('POST', '/permission-test/users')" class="test-button">
                建立用戶 (users.create)
            </button>
            <div class="permission-info">需要: SUPER_ADMIN, GLOBAL_ADMIN, AGENT_LEVEL_1</div>
            <br>

            <h3>進階權限測試</h3>
            <button onclick="testEndpoint('GET', '/permission-test/dashboard')" class="test-button">
                儀表板 (任一權限)
            </button>
            <div class="permission-info">需要: agents.view 或 users.view (任一即可)</div>
            <br>
            
            <button onclick="testEndpoint('GET', '/permission-test/admin-panel')" class="test-button">
                管理面板 (多重權限)
            </button>
            <div class="permission-info">需要: users.view 和 agents.view (同時具備)</div>
            <br>
            
            <button onclick="testEndpoint('DELETE', '/permission-test/system/reset')" class="test-button danger">
                系統重置 (最高權限)
            </button>
            <div class="permission-info">需要: system.maintenance (只有 SUPER_ADMIN)</div>
        </div>

        <!-- 結果顯示 -->
        <div>
            <h2>📊 測試結果</h2>
            <button onclick="clearResults()" class="test-button" style="background: #9e9e9e;">清除結果</button>
            <div id="testResults"></div>
        </div>
    </div>

    <script>
        let authToken = localStorage.getItem('authToken') || '';

        window.onload = function() {
            updateLoginStatus();
        };

        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const resultDiv = document.getElementById('loginResult');

            if (!username || !password) {
                showResult(resultDiv, '請輸入用戶名和密碼', 'error');
                return;
            }

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    authToken = data.access_token || data.token;
                    localStorage.setItem('authToken', authToken);
                    updateLoginStatus();
                    // 顯示更詳細的登入資訊用於調試
                    showResult(resultDiv, '✅ 登入成功\\n用戶: ' + username + '\\n角色: ' + (data.user?.role || 'N/A') + '\\nToken: ' + (authToken ? authToken.substring(0, 20) + '...' : 'N/A'), 'success');
                } else {
                    showResult(resultDiv, '❌ 登入失敗: ' + (data.message || '未知錯誤'), 'error');
                }
            } catch (error) {
                showResult(resultDiv, '❌ 登入錯誤: ' + error.message, 'error');
            }
        }

        function logout() {
            authToken = '';
            localStorage.removeItem('authToken');
            updateLoginStatus();
            clearResults();
            document.getElementById('loginResult').innerHTML = '';
            document.getElementById('loginResult').style.display = 'none';
        }

        function updateLoginStatus() {
            const statusDiv = document.getElementById('loginStatus');
            if (authToken) {
                statusDiv.className = 'status logged-in';
                statusDiv.innerHTML = '✅ 已登入';
            } else {
                statusDiv.className = 'status logged-out';
                statusDiv.innerHTML = '❌ 未登入';
            }
        }

        async function testEndpoint(method, endpoint) {
            if (!authToken) {
                alert('請先登入！');
                return;
            }

            const resultsDiv = document.getElementById('testResults');
            const testTime = new Date().toLocaleTimeString();

            try {
                const response = await fetch(endpoint, {
                    method: method,
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                const resultClass = response.ok ? 'success' : 'error';
                const statusIcon = response.ok ? '✅' : '❌';

                const resultHTML = 
                    '<div class="result ' + resultClass + '">' +
                        '<strong>' + statusIcon + ' [' + testTime + '] ' + method + ' ' + endpoint + '</strong>' +
                        '<div>狀態碼: ' + response.status + '</div>' +
                        '<div>回應: ' + JSON.stringify(data, null, 2) + '</div>' +
                    '</div>';

                resultsDiv.innerHTML = resultHTML + resultsDiv.innerHTML;
            } catch (error) {
                const resultHTML = 
                    '<div class="result error">' +
                        '<strong>❌ [' + testTime + '] ' + method + ' ' + endpoint + '</strong>' +
                        '<div>錯誤: ' + error.message + '</div>' +
                    '</div>';
                resultsDiv.innerHTML = resultHTML + resultsDiv.innerHTML;
            }
        }

        function showResult(element, message, type) {
            element.className = 'result ' + type;
            element.innerHTML = message;
            element.style.display = 'block';
        }

        function clearResults() {
            document.getElementById('testResults').innerHTML = '';
        }
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}