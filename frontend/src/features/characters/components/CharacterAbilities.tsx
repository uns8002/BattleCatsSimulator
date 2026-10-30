import type { CharacterFormDto as Form } from '../api/characterDto';
import { IconBadge } from '../../../shared/ui/IconBadge';
export function CharacterAbilities({ form }: { form: Form }) {
  return (
    <section className="card">
      <h2>能力</h2>
      <div className="badges">
        {form.abilities?.length ? (
          form.abilities.map((a) => (
            <IconBadge key={a.form_ability_id} imageKey={a.image_url} label={a.ability_name} />
          ))
        ) : (
          <p className="muted">{form.abilities === null ? '未提供' : '登録なし'}</p>
        )}
      </div>
    </section>
  );
}
