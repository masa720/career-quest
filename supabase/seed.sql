-- Development-only sample data. Run explicitly with `supabase db reset` locally.
insert into public.tasks (
  id, category, title, priority, description, memo, is_completed, position, is_daily, completed_at
)
values
  (
    '10000000-0000-4000-8000-000000000001', 'technical',
    'async/awaitを日本語で説明できるようにする', 'high',
    'Promiseとの違いを含めて60秒程度で説明する', null, false, 0, false, null
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'coding',
    'LeetCodeを1問解く', 'high',
    '解法の計算量まで説明できるようにする', null, false, 1, true, null
  ),
  (
    '10000000-0000-4000-8000-000000000003', 'technical',
    'async/awaitを英語で説明できるようにする', 'high',
    '原稿なしで説明し、録音を1回聞き直す', null, false, 2, false, null
  ),
  (
    '10000000-0000-4000-8000-000000000004', 'behavioral',
    'Failureエピソードを1つSTARで整理する', 'medium',
    'Situation / Task / Action / Resultを各3行以内でまとめる',
    '結果は数字で表現できるか確認する', false, 3, false, null
  ),
  (
    '10000000-0000-4000-8000-000000000005', 'english',
    'STARエピソードを原稿なしで話す', 'medium',
    '2分以内で自然に話せる状態にする', null, true, 0, true, now()
  )
on conflict (id) do nothing;

insert into public.task_completion_events (id, task_id, completed_at)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005',
    now() - interval '1 day'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000005',
    now()
  )
on conflict (id) do nothing;
