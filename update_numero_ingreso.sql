-- Script para actualizar números de ingreso en registros existentes
-- Ejecutar este script en PostgreSQL para asignar números a registros que no los tienen

-- Primero, actualizar la función trigger (si no se ha hecho ya)
CREATE OR REPLACE FUNCTION generar_numero_ingreso()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_numero VARCHAR(20);
    contador INTEGER;
    año INTEGER;
BEGIN
    -- Solo generar si numero_ingreso está vacío o es NULL
    IF NEW.numero_ingreso IS NULL OR NEW.numero_ingreso = '' THEN
        -- Obtener el año actual
        año := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
        
        -- Contar cuántas reparaciones hay en el año actual
        SELECT COUNT(*) + 1 INTO contador
        FROM reparaciones 
        WHERE EXTRACT(YEAR FROM fecha_creacion) = año;
        
        -- Generar el número de ingreso
        nuevo_numero := 'R-' || año || '-' || LPAD(contador::TEXT, 3, '0');
        
        -- Asignar el número de ingreso
        NEW.numero_ingreso := nuevo_numero;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actualizar registros existentes que no tienen número de ingreso
DO $$
DECLARE
    rec RECORD;
    nuevo_numero VARCHAR(20);
    contador INTEGER;
    año_actual INTEGER;
    año_registro INTEGER;
BEGIN
    -- Procesar por año para mantener secuencia correcta
    FOR año_actual IN 
        SELECT DISTINCT EXTRACT(YEAR FROM fecha_creacion)::INTEGER as año
        FROM reparaciones 
        WHERE numero_ingreso IS NULL OR numero_ingreso = ''
        ORDER BY año
    LOOP
        -- Reiniciar contador para cada año
        contador := 1;
        
        -- Procesar registros de este año
        FOR rec IN 
            SELECT id, fecha_creacion 
            FROM reparaciones 
            WHERE (numero_ingreso IS NULL OR numero_ingreso = '')
            AND EXTRACT(YEAR FROM fecha_creacion) = año_actual
            ORDER BY fecha_creacion ASC
        LOOP
            -- Generar número secuencial por año
            nuevo_numero := 'R-' || año_actual || '-' || LPAD(contador::TEXT, 3, '0');
            
            -- Actualizar el registro
            UPDATE reparaciones 
            SET numero_ingreso = nuevo_numero 
            WHERE id = rec.id;
            
            -- Incrementar contador
            contador := contador + 1;
            
            RAISE NOTICE 'Actualizado registro ID % con número %', rec.id, nuevo_numero;
        END LOOP;
    END LOOP;
END $$;

-- Verificar que todos los registros tienen número de ingreso
SELECT id, numero_ingreso, fecha_creacion 
FROM reparaciones 
WHERE estado_actual = 'recepcion'
ORDER BY id;
