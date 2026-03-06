-- ============================================
-- CASA 확장판 트리거 업데이트 (모두의 창업)
-- handle_new_user 트리거를 역할/승인 지원으로 확장
-- ============================================

-- 기존 트리거 함수 교체
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_is_approved BOOLEAN;
BEGIN
  -- 메타데이터에서 역할 읽기 (기본: 'user')
  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
    'user'::user_role
  );

  -- user/admin은 즉시 승인, mentor/institution은 승인 대기
  v_is_approved := CASE
    WHEN v_role IN ('user', 'admin') THEN true
    ELSE false
  END;

  INSERT INTO public.bi_users (id, email, name, role, locale, theme, is_approved, approved_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_role,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'locale', '')::locale, 'ko'::locale),
    'system',
    v_is_approved,
    CASE WHEN v_is_approved THEN now() ELSE NULL END
  );

  -- 멘토인 경우 멘토 프로필 자동 생성
  IF v_role = 'mentor' THEN
    INSERT INTO public.bi_mentor_profiles (user_id, specialty)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.raw_user_meta_data->>'specialty' IS NOT NULL
          AND NEW.raw_user_meta_data->>'specialty' != ''
        THEN string_to_array(NEW.raw_user_meta_data->>'specialty', ',')
        ELSE '{}'::TEXT[]
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
