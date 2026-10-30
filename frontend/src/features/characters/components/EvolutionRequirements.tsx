import type { CharacterFormDto } from '../api/characterDto';
import { AssetImage } from '../../../shared/ui/AssetImage';

export function EvolutionRequirements({ form }: { form: CharacterFormDto }) {
  const hasLevel = form.required_level !== null && form.required_level > 0;
  const hasStage = form.required_stage_id !== null;
  const materials = form.materials ?? [];
  return (
    <div className="evolution">
      <span>進化条件</span>
      {hasLevel && <strong>Lv{form.required_level}</strong>}
      {hasStage && <span>ステージID {form.required_stage_id} のクリア</span>}
      {!hasLevel && !hasStage && materials.length === 0 && (
        <span className="unknown">{form.materials === null ? '素材情報未提供' : '条件なし'}</span>
      )}
      {materials.length > 0 && (
        <div className="evolution-materials" aria-label="進化素材">
          {materials.map((material) => (
            <span
              className="evolution-material"
              key={material.form_material_id}
              title={material.material_name}
            >
              <span className="evolution-material-image">
                <AssetImage
                  imageKey={material.image_url}
                  name={material.material_name}
                  fallbackText={material.material_name}
                />
              </span>
              <span>×{material.required_quantity}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
