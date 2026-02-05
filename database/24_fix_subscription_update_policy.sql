-- ============================================
-- PASO 24: PERMITIR A DUEÑOS ACTUALIZAR SUSCRIPCIONES
-- ============================================

-- Habilitar a los dueños para actualizar su propia suscripción (ej: cancelar)
CREATE POLICY "Owners can update own subscription"
ON subscriptions FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
