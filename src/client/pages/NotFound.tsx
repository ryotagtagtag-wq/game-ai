/** 404 Not Found ページ */

import { Link } from 'preact-router/match';

const NotFound = () => {
  return (
    <div class="not-found">
      <div class="not-found-card">
        <h1>404</h1>
        <h2>ページが見つかりません</h2>
        <p>お探しのページは存在しないか、移動した可能性があります。</p>
        <Link href="/" class="btn btn-primary mt-16">トップページへ戻る</Link>
      </div>
    </div>
  );
};

export default NotFound;