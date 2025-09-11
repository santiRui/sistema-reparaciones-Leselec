-- Tabla de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni_cuil VARCHAR(20) NOT NULL,
    tipo_cliente VARCHAR(20) NOT NULL, -- Particular/Empresa
    telefono VARCHAR(20),
    correo VARCHAR(100),
    email VARCHAR(100), -- agregado para compatibilidad con frontend
    direccion TEXT
);

-- Tabla de personal (usuarios del sistema)
CREATE TABLE personal (
    id SERIAL PRIMARY KEY,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'ventas', 'cajero', 'encargado')),
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de reparaciones
CREATE TABLE reparaciones (
    id SERIAL PRIMARY KEY,
    numero_ingreso VARCHAR(20) UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    estado_actual VARCHAR(50) NOT NULL, -- Ej: recepcion, presupuesto, reparacion, entrega
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES personal(id),
    elementos_faltantes TEXT,
    accesorios TEXT,
    numero_remito VARCHAR(50),
    numero_orden_compra VARCHAR(50),
    observaciones_recepcion TEXT
);

-- Función para generar número de ingreso automáticamente
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

-- Trigger para generar número de ingreso automáticamente
CREATE TRIGGER trigger_generar_numero_ingreso
    BEFORE INSERT ON reparaciones
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_ingreso();

-- Tabla de equipos
CREATE TABLE equipos (
    id SERIAL PRIMARY KEY,
    reparacion_id INTEGER NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
    tipo_equipo VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    numero_serie VARCHAR(100) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    potencia VARCHAR(50),
    tension VARCHAR(50),
    revoluciones VARCHAR(50)
);

-- Tabla de presupuesto
CREATE TABLE presupuestos (
    id SERIAL PRIMARY KEY,
    reparacion_id INTEGER NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
    diagnostico_falla TEXT NOT NULL,
    descripcion_proceso TEXT,
    repuestos_necesarios TEXT,
    importe_total NUMERIC(12,2) NOT NULL,
    seña NUMERIC(12, 2)
);

-- Tabla de trabajo de reparación
CREATE TABLE trabajos_reparacion (
    id SERIAL PRIMARY KEY,
    reparacion_id INTEGER NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
    encargado_id INTEGER REFERENCES personal(id),
    supervisor_id INTEGER REFERENCES personal(id),
    tecnico_id INTEGER REFERENCES personal(id),
    estado_reparacion VARCHAR(50) NOT NULL,
    prioridad VARCHAR(50),
    fecha_inicio DATE,
    fecha_fin DATE,
    observaciones TEXT
);

-- Tabla de entregas
CREATE TABLE entregas (
    id SERIAL PRIMARY KEY,
    reparacion_id INTEGER NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
    cajero_id INTEGER REFERENCES personal(id),
    fecha_retiro DATE,
    nombre_retirante VARCHAR(100),
    apellido_retirante VARCHAR(100),
    dni_retirante VARCHAR(20),
    firma_observaciones TEXT,
    estado_entrega VARCHAR(50)
);

-- Índices útiles
CREATE INDEX idx_reparaciones_cliente ON reparaciones(cliente_id);
