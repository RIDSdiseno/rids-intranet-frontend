import { Modal } from "antd";

interface Props {
    open: boolean;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteTicketModal({ open, loading, onConfirm, onCancel }: Props) {
    return (
        <Modal
            title="¿Eliminar ticket?"
            open={open}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="Eliminar"
            okButtonProps={{ danger: true, loading, disabled: loading }}
            cancelButtonProps={{ disabled: loading }}
            closable={!loading}
        >
            <p>Esta acción no se puede deshacer. ¿Estás seguro?</p>
        </Modal>
    );
}