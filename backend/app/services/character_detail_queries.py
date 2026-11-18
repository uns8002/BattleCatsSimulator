"""提供された詳細取得SQL。JOIN・カラム・順序は原文を維持。"""

from sqlalchemy import text

QUERIES = {
    1: text("""
SELECT c.character_id, c.character_name, c.character_short_name,
       rarity.value_name AS rarity_name,
       limited.value_name AS limited_name,
       collaboration.value_name AS collaboration_name
FROM characters c
LEFT JOIN category_values rarity ON rarity.group_id = '001' AND rarity.value_id = c.rarity_id AND rarity.is_deleted = 0
LEFT JOIN category_values limited ON limited.group_id = '002' AND limited.value_id = c.limited_id AND limited.is_deleted = 0
LEFT JOIN category_values collaboration ON collaboration.group_id = '003' AND collaboration.value_id = c.collaboration_id AND collaboration.is_deleted = 0
WHERE c.character_id = :character_id AND c.is_deleted = 0;
"""),
    2: text("""
SELECT f.form_id, f.character_id, f.form_number, f.form_name, f.form_short_name,
       f.hp, f.attack_power, f.knockbacks, f.movement_speed, f.attack_range,
       f.attack_frequency_frames, f.attack_startup_frames, f.respawn_frames,
       f.production_cost, ia.storage_key AS image_url, f.description_body,
       gv.game_version AS game_version_name,
       NULL AS required_level, NULL AS required_stage_id
FROM forms f
LEFT JOIN image_assets ia ON ia.image_id = f.image_id AND ia.is_deleted = 0
LEFT JOIN game_versions gv ON gv.game_version_id = f.game_version_id AND gv.is_deleted = 0
WHERE f.character_id = :character_id AND f.is_active = '1' AND f.is_deleted = 0
ORDER BY f.form_number, f.form_id;
"""),
    3: text("""
SELECT fet.form_id, fet.form_effect_target_id, et.effect_target_id,
       et.effect_target_code, et.effect_target_name, et.effect_target_short_name,
       ia.storage_key AS image_url
FROM form_effect_targets fet
JOIN forms f ON f.form_id = fet.form_id
LEFT JOIN effect_targets et ON et.effect_target_id = fet.effect_target_id AND et.is_deleted = 0
LEFT JOIN image_assets ia ON ia.image_id = et.image_id AND ia.is_deleted = 0
WHERE f.character_id = :character_id AND f.is_active = '1' AND f.is_deleted = 0
  AND fet.is_active = '1' AND fet.is_deleted = 0
ORDER BY fet.form_id, fet.form_effect_target_id;
"""),
    4: text("""
SELECT fe.form_id, fe.form_effect_id, e.effect_id, e.effect_code,
       e.effect_name, e.effect_short_name, e.parameter_schema,
       fe.attack_order, fe.parameter_values, ia.storage_key AS image_url
FROM form_effects fe
JOIN forms f ON f.form_id = fe.form_id
LEFT JOIN effects e ON e.effect_id = fe.effect_id AND e.is_deleted = 0
LEFT JOIN image_assets ia ON ia.image_id = e.image_id AND ia.is_deleted = 0
WHERE f.character_id = :character_id AND f.is_active = '1' AND f.is_deleted = 0
  AND fe.is_active = '1' AND fe.is_deleted = 0
ORDER BY fe.form_id, fe.form_effect_id;
"""),
    5: text("""
SELECT fa.form_id, fa.form_ability_id, a.ability_id, a.ability_code,
       a.ability_name, a.ability_short_name, a.parameter_schema,
       fa.parameter_values, ia.storage_key AS image_url
FROM form_abilities fa
JOIN forms f ON f.form_id = fa.form_id
LEFT JOIN abilities a ON a.ability_id = fa.ability_id AND a.is_deleted = 0
LEFT JOIN image_assets ia ON ia.image_id = a.image_id AND ia.is_deleted = 0
WHERE f.character_id = :character_id AND f.is_active = '1' AND f.is_deleted = 0
  AND fa.is_active = '1' AND fa.is_deleted = 0
ORDER BY fa.form_id, fa.form_ability_id;
"""),
    6: text("""
SELECT
    fm.form_id,
    fm.form_material_id,
    m.material_id,
    m.material_code,
    m.material_name,
    m.material_short_name,
    m.material_type,
    fm.required_quantity,
    ia.storage_key AS image_url
FROM form_materials fm
INNER JOIN forms f
    ON f.form_id = fm.form_id
LEFT JOIN materials m
    ON m.material_id = fm.material_id
   AND m.is_deleted = 0
LEFT JOIN image_assets ia
    ON ia.image_id = m.image_id
   AND ia.is_deleted = 0
WHERE f.character_id = :character_id
  AND f.is_active = '1'
  AND f.is_deleted = 0
  AND fm.is_active = '1'
  AND fm.is_deleted = 0
ORDER BY fm.form_id, fm.form_material_id;
"""),
    7: text("""
SELECT t.character_id, t.form_effect_target_talent_id AS talent_id, t.effect_target_id,
       et.effect_target_code, et.effect_target_name, et.effect_target_short_name,
       ia.storage_key AS image_url, t.talent_type, cv.value_name AS talent_type_name,
       t.np_id, np.max_level, np.lv1, np.lv2, np.lv3, np.lv4, np.lv5,
       np.lv6, np.lv7, np.lv8, np.lv9, np.lv10
FROM form_effect_target_talents t
LEFT JOIN effect_targets et ON et.effect_target_id = t.effect_target_id AND et.is_deleted = 0
LEFT JOIN image_assets ia ON ia.image_id = et.image_id AND ia.is_deleted = 0
LEFT JOIN category_values cv ON cv.group_id = '004' AND cv.value_id = t.talent_type AND cv.is_deleted = 0
LEFT JOIN np ON np.np_id = t.np_id AND np.is_deleted = 0
WHERE t.character_id = :character_id
  AND t.is_active = '1' AND t.is_deleted = 0
ORDER BY t.form_effect_target_talent_id;
"""),
    8: text("""
SELECT t.character_id, t.form_effect_talent_id AS talent_id, t.effect_id,
       e.effect_code, e.effect_name, e.effect_short_name, e.parameter_schema,
       ia.storage_key AS image_url, t.attack_order, t.parameter_values,
       t.talent_type, cv.value_name AS talent_type_name, t.np_id,
       np.max_level, np.lv1, np.lv2, np.lv3, np.lv4, np.lv5,
       np.lv6, np.lv7, np.lv8, np.lv9, np.lv10
FROM form_effect_talents t
LEFT JOIN effects e ON e.effect_id = t.effect_id AND e.is_deleted = 0
LEFT JOIN image_assets ia ON ia.image_id = e.image_id AND ia.is_deleted = 0
LEFT JOIN category_values cv ON cv.group_id = '004' AND cv.value_id = t.talent_type AND cv.is_deleted = 0
LEFT JOIN np ON np.np_id = t.np_id AND np.is_deleted = 0
WHERE t.character_id = :character_id
  AND t.is_active = '1' AND t.is_deleted = 0
ORDER BY t.form_effect_talent_id;
"""),
    9: text("""
SELECT t.character_id, t.form_ability_talent_id AS talent_id, t.ability_id,
       a.ability_code, a.ability_name, a.ability_short_name, a.parameter_schema,
       ia.storage_key AS image_url, t.attack_order, t.parameter_values,
       t.talent_type, cv.value_name AS talent_type_name, t.np_id,
       np.max_level, np.lv1, np.lv2, np.lv3, np.lv4, np.lv5,
       np.lv6, np.lv7, np.lv8, np.lv9, np.lv10
FROM form_ability_talents t
LEFT JOIN abilities a ON a.ability_id = t.ability_id AND a.is_deleted = 0
LEFT JOIN image_assets ia ON ia.image_id = a.image_id AND ia.is_deleted = 0
LEFT JOIN category_values cv ON cv.group_id = '004' AND cv.value_id = t.talent_type AND cv.is_deleted = 0
LEFT JOIN np ON np.np_id = t.np_id AND np.is_deleted = 0
WHERE t.character_id = :character_id
  AND t.is_active = '1' AND t.is_deleted = 0
ORDER BY t.form_ability_talent_id;
"""),
}
