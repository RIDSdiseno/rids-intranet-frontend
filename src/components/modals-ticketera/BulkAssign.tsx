import { Modal, Select } from "antd";

interface Tecnico {
    id_tecnico: number;
    nombre: string;
}

interface Props {
    open: boolean;
    ticketCount: number;
    tecnicos: Tecnico[];
    selectedTechnicianId: number | null;
    onChange: (id: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function BulkAssignModal({
    open, ticketCount, tecnicos, selectedTechnicianId, onChange, onConfirm, onCancel
}: Props) {
    return (
        <Modal
            title="Asignar tickets seleccionados"
            open={open}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="Asignar"
            cancelText="Cancelar"
        >
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                    Se asignarán {ticketCount} ticket(s) al técnico seleccionado.
                </p>
                <Select
                    style={{ width: "100%" }}
                    placeholder="Seleccionar técnico"
                    value={selectedTechnicianId}
                    onChange={onChange}
                    options={tecnicos.map(t => ({
                        value: t.id_tecnico,
                        label: t.nombre,
                    }))}
                />
            </div>
        </Modal>
    );
}