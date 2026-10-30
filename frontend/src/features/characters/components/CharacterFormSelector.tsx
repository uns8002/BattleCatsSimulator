import type { CharacterFormDto as Form } from '../api/characterDto';
export function CharacterFormSelector({
  forms,
  selected,
  onChange,
}: {
  forms: Form[];
  selected: number;
  onChange: (id: number) => void;
}) {
  return (
    <div className="form-selector" aria-label="形態">
      {forms.map((form) => (
        <button
          key={form.form_id}
          aria-pressed={selected === form.form_id}
          onClick={() => onChange(form.form_id)}
        >
          第{form.form_number}
        </button>
      ))}
    </div>
  );
}
