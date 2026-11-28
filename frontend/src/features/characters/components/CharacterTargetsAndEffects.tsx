import type { CharacterFormDto as Form } from '../api/characterDto';
import { IconBadge } from '../../../shared/ui/IconBadge';
export function CharacterTargetsAndEffects({ form }: { form: Form }) {
  return (
    <>
      <section className="card">
        <h2>ターゲット</h2>
        <div className="badges">
          {form.effect_targets?.length ? (
            form.effect_targets.map((t) => (
              <IconBadge
                showLabel={false}
                key={t.form_effect_target_id}
                imageKey={t.image_url}
                label={t.effect_target_name}
              />
            ))
          ) : (
            <span className="muted">{form.effect_targets === null ? '未提供' : '登録なし'}</span>
          )}
        </div>
      </section>
      <section className="card">
        <h2>効果</h2>
        <div className="badges">
          {form.effects?.length ? (
            form.effects.map((e) => (
              <IconBadge
                showLabel={false}
                key={e.form_effect_id}
                imageKey={e.image_url}
                label={e.effect_name}
              />
            ))
          ) : (
            <span className="muted">{form.effects === null ? '未提供' : '登録なし'}</span>
          )}
        </div>
      </section>
    </>
  );
}
