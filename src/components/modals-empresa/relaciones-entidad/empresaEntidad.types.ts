export type TipoCoincidenciaEntidad =
    | "RUT_EXACTO"
    | "NOMBRE_EXACTO";


export type EmpresaEntidadMini = {
    id:
    number;

    nombre:
    string;

    rut:
    string | null;

    correo:
    string | null;

    telefono:
    string | null;

    direccion:
    string | null;

    origen:
    string;

    empresaId:
    number | null;
};


export type EmpresaRelacionInfo = {
    id_empresa:
    number;

    nombre:
    string;

    isActive:
    boolean;

    detalleEmpresa:
    {
        rut:
        string | null;

        direccion:
        string | null;

        email:
        string | null;

        telefono:
        string | null;
    } | null;

    entidadGestioos:
    EmpresaEntidadMini[];
};


export type EmpresaEntidadSugerencia =
    EmpresaEntidadMini & {
        coincidencia:
        TipoCoincidenciaEntidad;

        vinculacionAutomaticaDisponible:
        boolean;
    };


export type EmpresaEntidadRelacionResponse = {
    success:
    boolean;

    data: {
        empresa:
        EmpresaRelacionInfo;

        entidadesRelacionadas:
        EmpresaEntidadMini[];

        sugerencias:
        EmpresaEntidadSugerencia[];
    };
};


export type EmpresaEntidadListadoResponse = {
    success:
    boolean;

    data:
    EmpresaEntidadMini[];
};


export type ResultadoRelacionAutomatica = {
    vinculada:
    boolean;

    yaExistia?:
    boolean;

    motivo:
    | "RUT_EXACTO"
    | "YA_VINCULADA"
    | "SIN_COINCIDENCIA_RUT"
    | "MULTIPLES_COINCIDENCIAS"
    | "EMPRESA_SIN_RUT"
    | "EMPRESA_NO_ENCONTRADA"
    | "EMPRESA_INACTIVA";

    entidad?:
    EmpresaEntidadMini;
};