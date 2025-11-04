const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静的ファイルの提供
app.use(express.static('public'));

// 投票セッションの状態管理
let votingState = {
  active: false,
  leftCount: 0,
  rightCount: 0,
  voters: new Set() // 重複投票防止
};

// WebSocket接続管理
let clients = {
  presenters: new Set(),
  students: new Set()
};

wss.on('connection', (ws) => {
  console.log('新しいクライアントが接続しました');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch(data.type) {
        case 'register_presenter':
          clients.presenters.add(ws);
          ws.role = 'presenter';
          console.log('教員が登録されました');
          // 現在の状態を送信
          ws.send(JSON.stringify({
            type: 'state_update',
            state: votingState
          }));
          break;

        case 'register_student':
          clients.students.add(ws);
          ws.role = 'student';
          ws.studentId = data.studentId || generateStudentId();
          console.log('学生が登録されました:', ws.studentId);
          // 現在の状態を送信
          ws.send(JSON.stringify({
            type: 'state_update',
            state: {
              active: votingState.active
            }
          }));
          break;

        case 'start_voting':
          // 教員のみが投票を開始できる
          if (ws.role === 'presenter') {
            votingState = {
              active: true,
              leftCount: 0,
              rightCount: 0,
              voters: new Set()
            };
            console.log('投票を開始しました');
            // 全クライアントに通知
            broadcastToAll({
              type: 'voting_started'
            });
          }
          break;

        case 'vote':
          // 学生のみが投票できる
          if (ws.role === 'student' && votingState.active) {
            const voterId = ws.studentId;

            // 重複投票チェック
            if (votingState.voters.has(voterId)) {
              ws.send(JSON.stringify({
                type: 'error',
                message: '既に投票済みです'
              }));
              break;
            }

            // 投票を記録
            if (data.choice === 'left') {
              votingState.leftCount++;
            } else if (data.choice === 'right') {
              votingState.rightCount++;
            }
            votingState.voters.add(voterId);

            console.log(`投票: ${data.choice}, 左: ${votingState.leftCount}, 右: ${votingState.rightCount}`);

            // 投票者に確認を送信
            ws.send(JSON.stringify({
              type: 'vote_confirmed',
              choice: data.choice
            }));

            // 教員に更新を送信
            broadcastToPresenters({
              type: 'vote_update',
              leftCount: votingState.leftCount,
              rightCount: votingState.rightCount,
              totalVotes: votingState.voters.size
            });
          }
          break;

        case 'show_results':
          // 教員のみが結果を表示できる
          if (ws.role === 'presenter') {
            votingState.active = false;
            console.log('結果を表示します');
            // 全クライアントに結果を送信
            broadcastToAll({
              type: 'results',
              leftCount: votingState.leftCount,
              rightCount: votingState.rightCount,
              totalVotes: votingState.voters.size
            });
          }
          break;

        case 'reset':
          // 教員のみがリセットできる
          if (ws.role === 'presenter') {
            votingState = {
              active: false,
              leftCount: 0,
              rightCount: 0,
              voters: new Set()
            };
            console.log('投票をリセットしました');
            broadcastToAll({
              type: 'reset'
            });
          }
          break;
      }
    } catch (error) {
      console.error('メッセージ処理エラー:', error);
    }
  });

  ws.on('close', () => {
    clients.presenters.delete(ws);
    clients.students.delete(ws);
    console.log('クライアントが切断されました');
  });

  ws.on('error', (error) => {
    console.error('WebSocketエラー:', error);
  });
});

// ブロードキャスト関数
function broadcastToAll(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastToPresenters(data) {
  const message = JSON.stringify(data);
  clients.presenters.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ユニークIDの生成
function generateStudentId() {
  return 'student_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

// ルート
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/presenter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'presenter.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`教員用: http://localhost:${PORT}/presenter`);
  console.log(`学生用: http://localhost:${PORT}/student`);
});
