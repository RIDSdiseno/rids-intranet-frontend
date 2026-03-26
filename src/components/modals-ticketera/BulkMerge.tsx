import { Modal, Select } from "antd";

interface Ticket {
    id: number;
    subject: string;
}

interface Props {
    open: boolean;
    selectedTickets: number[];
    tickets: Ticket[];
    selectedMainTicketId: number | null;
    onChange: (id: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function BulkMergeModal({
    open, selectedTickets, tickets, selectedMainTicketId, onChange, onConfirm, onCancel
}: Props) {
    return (
        <Modal
            title="Fusionar tickets"
            open={open}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="Fusionar"
            cancelText="Cancelar"
        >
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                    Los mensajes de todos los tickets se moverán al ticket principal.
                </p>
                <Select
                    style={{ width: "100%" }}
                    placeholder="Seleccionar ticket principal"
                    value={selectedMainTicketId}
                    onChange={onChange}
                    options={selectedTickets.map(id => {
                        const ticket = tickets.find(t => t.id === id);
                        return {
                            value: id,
                            label: `#${id} - ${ticket?.subject || 'Sin asunto'}`,
                        };
                    })}
                />
            </div>
        </Modal>
    );
}