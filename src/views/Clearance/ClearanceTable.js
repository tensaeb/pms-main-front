import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    CTable,
    CTableBody,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
    CTableDataCell,
    CButton,
    CPagination,
    CPaginationItem,
    CFormInput,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem,
    CBadge,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
} from '@coreui/react';
import "../paggination.scss";
import { CIcon } from '@coreui/icons-react';
import {
    cilPencil,
    cilTrash,
    cilArrowTop,
    cilArrowBottom,
    cilFile,
    cilClipboard,
    cilCloudDownload,
    cilFullscreen,
    cilOptions,
    cilInfo,
    cilCalendar,
    cilDescription,
} from '@coreui/icons';
import { CSVLink } from 'react-csv';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { decryptData } from '../../api/utils/crypto';
import ClearanceTableActions from "./ClearanceTableActions";
import { formatDate } from "../../api/utils/dateFormatter";
import { setSelectedClearance } from '../../api/slice/clearanceSlice';
import { deleteClearance, updateClearance } from '../../api/actions/ClearanceAction';
import debounce from 'lodash/debounce';

const ClearanceTable = ({
    searchTerm,
    setSearchTerm,
    itemsPerPage = 10,
}) => {
    const dispatch = useDispatch();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedClearance, setSelectedClearanceData] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [userPermissions, setUserPermissions] = useState(null);
    const dropdownRefs = useRef({});
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const { clearances, loading, error, totalPages, currentPage, totalClearances } = useSelector((state) => ({
        clearances: state.clearance.clearances || [],
        loading: state.clearance.loading,
        error: state.clearance.error,
        totalPages: state.clearance.totalPages || 1,
        currentPage: state.clearance.currentPage || 1,
        totalClearances: state.clearance.totalClearances || 0,
    }));
    const [approveModalVisible, setApproveModalVisible] = useState(false);
    const [clearanceToApprove, setClearanceToApprove] = useState(null);

    const handleClickOutside = useCallback((event) => {
        if (dropdownOpen) {
            const ref = dropdownRefs.current[dropdownOpen];
            if (ref && !ref.contains(event.target)) {
                setDropdownOpen(null)
            }
        }
    }, [dropdownOpen]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [handleClickOutside]);
    useEffect(() => {
    }, [dispatch, currentPage, searchTerm, itemsPerPage]); //Depend only on necessary parameters

    useEffect(() => {
        const encryptedUser = localStorage.getItem('user');
        if (encryptedUser) {
            const decryptedUser = decryptData(encryptedUser);
            if (decryptedUser && decryptedUser.permissions) {
                setUserPermissions(decryptedUser.permissions);
            }
        }
    }, []);


    const handleSort = (key) => {
        setSortConfig((prevConfig) => {
            const direction =
                prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending';
            return { key, direction };
        });
    };

    const sortedClearances = useMemo(() => {
        if (!sortConfig.key) return clearances;

        return [...clearances].sort((a, b) => {
            const aKey = (a[sortConfig.key] && typeof a[sortConfig.key] === 'object') ? (a[sortConfig.key]?.tenantName || a[sortConfig.key]?.name || '') : (a[sortConfig.key] || '');
            const bKey = (b[sortConfig.key] && typeof b[sortConfig.key] === 'object') ? (b[sortConfig.key]?.tenantName || b[sortConfig.key]?.name || '') : (b[sortConfig.key] || '');

            if (aKey < bKey) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aKey > bKey) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [clearances, sortConfig]);



    const csvData = clearances.map((clearance, index) => ({
        index: (currentPage - 1) * itemsPerPage + index + 1,
        tenantName: clearance?.tenant?.tenantName || 'N/A',
        notes: clearance?.notes || 'N/A',
        moveOutDate: formatDate(clearance?.moveOutDate) || 'N/A',
        status: clearance?.status || 'N/A',
    }));

    const clipboardData = clearances
        .map(
            (clearance, index) =>
                `${(currentPage - 1) * itemsPerPage + index + 1}.  Tenant Name: ${clearance?.tenant?.tenantName || 'N/A'}, Notes: ${
                    clearance?.notes || 'N/A'
                }, Move Out Date: ${formatDate(clearance?.moveOutDate) || 'N/A'}, Status: ${clearance?.status || 'N/A'}`
        )
        .join('\n');

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text('Clearance Data', 14, 10);

        const tableData = clearances.map((clearance, index) => [
            (currentPage - 1) * itemsPerPage + index + 1,
            clearance?.tenant?.tenantName || 'N/A',
            clearance?.notes || 'N/A',
            formatDate(clearance?.moveOutDate) || 'N/A',
            clearance?.status || 'N/A',
        ]);

        doc.autoTable({
            head: [['#', 'Tenant Name', 'Notes', 'Move Out Date', 'Status']],
            body: tableData,
            startY: 20,
        });

        doc.save('clearance_data.pdf');
    };

    const debouncedSearch = useCallback(
        debounce((term) => {
            dispatch(fetchClearances({ page: 1, limit: itemsPerPage, search: term }));
        }, 500),
        [dispatch, itemsPerPage]
    );

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        debouncedSearch(term);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            dispatch(fetchClearances({ page, limit: itemsPerPage, search: searchTerm }));
        }
    };
    const handleEdit = (id) => {
        console.log(id);
        toast.error("Not implemented for now");
    };
    const handleApprove = (clearance) => {
        setClearanceToApprove(clearance);
        setApproveModalVisible(true);
    };
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this clearance request?")) {
            dispatch(deleteClearance(id));
            toast.success('Clearance deleted successfully');
        }
    };
    const toggleDropdown = (clearanceId) => {
        setDropdownOpen(prevState => prevState === clearanceId ? null : clearanceId);
    };
    const closeDropdown = () => {
        setDropdownOpen(null);
    };
    const handleModalOpen = (clearance) => {
        setSelectedClearanceData(clearance);
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedClearanceData(null);
    };
    const baseURL = "http://localhost:4000/api/v1/";

    const getStatusStyle = (status) => {
        switch (status) {
            case 'rejected':
                return { fontWeight: 'bold', color: 'red' };
            case 'pending':
                return { fontWeight: 'bold', color: 'orange' };
            case 'approved':
                return { fontWeight: 'bold', color: 'green' };
            case 'inspected':
                return { fontWeight: 'bold', color: 'blue' };
            default:
                return {};
        }
    };
    const confirmApprove = async () => {
        if (!clearanceToApprove?._id) {
            toast.error('No clearance request selected for approval');
            return;
        }
        try {
            await dispatch(updateClearance(clearanceToApprove._id, { ...clearanceToApprove, status: "Approved" })).unwrap();
            toast.success('Clearance approved successfully');
            setApproveModalVisible(false);
        } catch (error) {
            toast.error(error?.message || 'Failed to approve clearance request');
        }
    }
    const confirmReject = async () => {
         if (!clearanceToApprove?._id) {
             toast.error('No clearance request selected for rejection');
             return;
         }
        try {
            await dispatch(updateClearance(clearanceToApprove._id, { ...clearanceToApprove, status: "Rejected" })).unwrap();
            toast.success('Clearance rejected successfully');
            setApproveModalVisible(false);
        } catch (error) {
             toast.error(error?.message || 'Failed to reject clearance request');
        }
     }

    const handleCloseApproveModal = () => {
        setApproveModalVisible(false);
        setClearanceToApprove(null);
    };

    return (
        <div>
            <div className="d-flex mb-3 gap-2">
                <div className="d-flex gap-2">
                    <CSVLink
                        data={csvData}
                        headers={[
                            { label: '#', key: 'index' },
                            { label: 'Tenant Name', key: 'tenantName' },
                            { label: 'Notes', key: 'notes' },
                            { label: 'Move Out Date', key: 'moveOutDate' },
                            { label: 'Status', key: 'status' },
                        ]}
                        filename="clearance_data.csv"
                        className="btn btn-dark"
                    >
                        <CIcon icon={cilFile} title="Export CSV" />
                    </CSVLink>
                    <CopyToClipboard text={clipboardData}>
                        <CButton color="dark" title="Copy to Clipboard">
                            <CIcon icon={cilClipboard} />
                        </CButton>
                    </CopyToClipboard>
                    <CButton color="dark" onClick={exportToPDF} title="Export PDF">
                        <CIcon icon={cilCloudDownload} />
                    </CButton>
                </div>
                <CFormInput
                    type="text"
                    placeholder="Search by tenant name or reason"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>
            <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                    <CTableRow>
                        <CTableHeaderCell className="bg-body-tertiary text-center">
                            <CIcon icon={cilInfo} />
                        </CTableHeaderCell>
                        <CTableHeaderCell className="bg-body-tertiary" onClick={() => handleSort('tenant')} style={{ cursor: 'pointer' }}>
                            Tenant Name
                            {sortConfig.key === 'tenant' && (
                                <CIcon icon={sortConfig.direction === 'ascending' ? cilArrowTop : cilArrowBottom} />
                            )}
                        </CTableHeaderCell>
                        <CTableHeaderCell className="bg-body-tertiary" onClick={() => handleSort('notes')} style={{ cursor: 'pointer' }}>
                            Notes
                            {sortConfig.key === 'notes' && (
                                <CIcon icon={sortConfig.direction === 'ascending' ? cilArrowTop : cilArrowBottom} />
                            )}
                        </CTableHeaderCell>
                        <CTableHeaderCell className="bg-body-tertiary" onClick={() => handleSort('moveOutDate')} style={{ cursor: 'pointer' }}>
                            Move Out Date
                            {sortConfig.key === 'moveOutDate' && (
                                <CIcon icon={sortConfig.direction === 'ascending' ? cilArrowTop : cilArrowBottom} />
                            )}
                        </CTableHeaderCell>
                        <CTableHeaderCell className="bg-body-tertiary" onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                            Status
                            {sortConfig.key === 'status' && (
                                <CIcon icon={sortConfig.direction === 'ascending' ? cilArrowTop : cilArrowBottom} />
                            )}
                        </CTableHeaderCell>
                        <CTableHeaderCell className="bg-body-tertiary">Actions</CTableHeaderCell>
                    </CTableRow>
                </CTableHead>
                <CTableBody>
                    {sortedClearances?.map((clearance, index) => (
                        <CTableRow key={clearance?._id || index}>
                            <CTableDataCell className="text-center">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </CTableDataCell>
                            <CTableDataCell>
                                {clearance?.tenant?.tenantName || 'N/A'}
                            </CTableDataCell>
                            <CTableDataCell>
                                {clearance?.notes || 'N/A'}
                            </CTableDataCell>
                            <CTableDataCell>
                                {formatDate(clearance?.moveOutDate) || 'N/A'}
                            </CTableDataCell>
                            <CTableDataCell>
                                {clearance.status === 'pending' ? (
                                    <CBadge color="warning">Pending</CBadge>
                                ) : clearance.status === 'approved' ? (
                                    <CBadge color="success">Approved</CBadge>
                                ) : clearance.status === 'rejected' ? (
                                    <CBadge color="danger">Rejected</CBadge>
                                ) : clearance.status === 'inspected' ? (
                                    <CBadge color="info">Inspected</CBadge>
                                ) : null
                                }
                            </CTableDataCell>
                             <CTableDataCell>
                                <CDropdown
                                    variant="btn-group"
                                    isOpen={dropdownOpen === clearance?._id}
                                    onToggle={() => toggleDropdown(clearance?._id)}
                                    onMouseLeave={closeDropdown}
                                    innerRef={ref => (dropdownRefs.current[clearance?._id] = ref)}
                                >
                                    <CDropdownToggle color="light" size="sm" title="Actions">
                                        <CIcon icon={cilOptions} />
                                    </CDropdownToggle>
                                    <CDropdownMenu>
                                        {/* {userPermissions?.editClearance && ( */}
                                            <CDropdownItem onClick={() => handleEdit(clearance?._id)} title="Edit">
                                                <CIcon icon={cilPencil} className="me-2" />
                                                Edit
                                            </CDropdownItem>
                                        {/* )} */}
                                        {/* {userPermissions?.deleteClearance && ( */}
                                            <CDropdownItem onClick={() => handleDelete(clearance?._id)} title="Delete" style={{ color: 'red' }}>
                                                <CIcon icon={cilTrash} className="me-2" />
                                                Delete
                                            </CDropdownItem>
                                        {/* )} */}
                                        <CDropdownItem onClick={() => handleModalOpen(clearance)} title="View Details">
                                            <CIcon icon={cilFullscreen} className="me-2" />
                                            Details
                                        </CDropdownItem>
                                        <CDropdownItem onClick={() => handleApprove(clearance)} title="Approve/Reject">
                                            <CIcon icon={cilFullscreen} className="me-2" />
                                            Approve/Reject
                                        </CDropdownItem>
                                    </CDropdownMenu>
                                </CDropdown>
                            </CTableDataCell>
                        </CTableRow>
                    ))}
                </CTableBody>
            </CTable>
            <div className="pagination-container d-flex justify-content-between align-items-center mt-3">
                <span>Total Requests: {totalClearances}</span>
                <CPagination className="mt-3">
                    <CPaginationItem disabled={currentPage === 1} onClick={() => handlePageChange(1)}>
                        «
                    </CPaginationItem>
                    <CPaginationItem
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                    >
                        ‹
                    </CPaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <CPaginationItem
                            key={page}
                            active={page === currentPage}
                            className=""
                            onClick={() => handlePageChange(page)}
                        >
                            {page}
                        </CPaginationItem>
                    ))}
                    <CPaginationItem
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                    >
                        ›
                    </CPaginationItem>
                    <CPaginationItem
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(totalPages)}
                    >
                        »
                    </CPaginationItem>
                </CPagination>
            </div>
             {/* Clearance Details Modal */}
            <CModal
                size="lg"
                visible={modalVisible}
                onClose={handleModalClose}
            >
                <CModalHeader onClose={handleModalClose}>
                    <CModalTitle>Clearance Details</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    {selectedClearance && (
                        <div>
                            <p><strong><CIcon icon={cilInfo} className="me-1" />Tenant Name:</strong> {selectedClearance?.tenant?.tenantName || 'N/A'}</p>
                            <p><strong><CIcon icon={cilDescription} className="me-1" />Notes:</strong> {selectedClearance?.notes || 'N/A'}</p>
                            <p><strong><CIcon icon={cilCalendar} className="me-1" />Move Out Date:</strong> {formatDate(selectedClearance?.moveOutDate)}</p>
                            <p>
                                <strong style={getStatusStyle(selectedClearance?.status)}>
                                    <CIcon icon={cilInfo} className="me-1" />Status:
                                </strong>
                                <span style={getStatusStyle(selectedClearance?.status)}>
                                    {selectedClearance?.status || 'N/A'}
                                </span>
                            </p>
                        </div>
                    )}
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={handleModalClose}>
                        Close
                    </CButton>
                </CModalFooter>
            </CModal>
             <CModal
                visible={approveModalVisible}
                onClose={handleCloseApproveModal}
                size="sm"
            >
                <CModalHeader onClose={handleCloseApproveModal}>
                    <CModalTitle>Approve or Reject Clearance Request</CModalTitle>
                </CModalHeader>
                 <CModalBody>
                    Are you sure you want to proceed with this request?
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={handleCloseApproveModal}>
                        Cancel
                    </CButton>
                      <CButton color="danger" onClick={confirmReject}>
                        Reject
                    </CButton>
                    <CButton color="primary" onClick={confirmApprove}>
                        Approve
                    </CButton>
                </CModalFooter>
            </CModal>
        </div>
    );
};

export default ClearanceTable;