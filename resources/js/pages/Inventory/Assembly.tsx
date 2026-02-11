import { FormEvent, useMemo, useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

interface Item {
    id: number;
    name: string;
    stock: number;
    is_main_assembly: boolean;
}

interface AssemblyPart {
    item_id: string;
    quantity: string;
}

interface AssemblyPart_Display {
    id: number;
    part_name: string;
    quantity_used: number;
}

interface Assembly {
    id: number;
    final_item_id: number;
    final_item_name: string;
    quantity: number;
    notes: string | null;
    user_name: string;
    created_at: string;
    parts: AssemblyPart_Display[];
}

interface PageProps {
    assemblies: {
        data: Assembly[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    items: Item[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item Assembly', href: '/inventory/assembly' },
];

export default function InventoryAssembly() {
    const { props } = usePage<PageProps>();
    const [assemblies, setAssemblies] = useState(props.assemblies?.data || []);
    const [items] = useState(props.items || []);
    const [isOpen, setIsOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingAssembly, setViewingAssembly] = useState<Assembly | null>(
        null
    );

    useEffect(() => {
        setAssemblies(props.assemblies?.data || []);
    }, [props.assemblies]);

    // Handle flash messages
    useEffect(() => {
        if (props.flash?.success) {
            setFlashMessage({ type: 'success', message: props.flash.success });
            setTimeout(() => setFlashMessage(null), 5000);
        } else if (props.flash?.error) {
            setFlashMessage({ type: 'error', message: props.flash.error });
        }
    }, [props.flash]);

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isOpen && !isViewOpen) {
                router.reload({ only: ['assemblies', 'items'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isOpen, isViewOpen]);

    const [formData, setFormData] = useState({
        final_item_id: '',
        quantity: '',
        notes: '',
        parts: [{ item_id: '', quantity: '' }] as AssemblyPart[],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const openViewDialog = (assembly: Assembly) => {
        setViewingAssembly(assembly);
        setIsViewOpen(true);
    };

    const handleViewToggle = (open: boolean) => {
        setIsViewOpen(open);
        if (!open) {
            setViewingAssembly(null);
        }
    };

    const filteredAssemblies = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return assemblies;
        }

        return assemblies.filter((assembly) => {
            const partsText = assembly.parts
                .map((part) => part.part_name)
                .join(' ')
                .toLowerCase();
            return (
                assembly.final_item_name.toLowerCase().includes(query) ||
                assembly.user_name.toLowerCase().includes(query) ||
                assembly.created_at.toLowerCase().includes(query) ||
                (assembly.notes ?? '').toLowerCase().includes(query) ||
                partsText.includes(query)
            );
        });
    }, [assemblies, searchQuery]);

    const handleFinalItemChange = (value: string) => {
        setFormData({ ...formData, final_item_id: value });
        setErrors({ ...errors, final_item_id: '' });
    };

    const handleQuantityChange = (value: string) => {
        setFormData({ ...formData, quantity: value });
        setErrors({ ...errors, quantity: '' });
    };

    const handleNotesChange = (value: string) => {
        setFormData({ ...formData, notes: value });
    };

    const handlePartChange = (
        index: number,
        field: 'item_id' | 'quantity',
        value: string
    ) => {
        const newParts = [...formData.parts];
        newParts[index][field] = value;
        setFormData({ ...formData, parts: newParts });
        setErrors({
            ...errors,
            [`parts.${index}.${field}`]: '',
        });
    };

    const addPart = () => {
        setFormData({
            ...formData,
            parts: [...formData.parts, { item_id: '', quantity: '' }],
        });
    };

    const removePart = (index: number) => {
        setFormData({
            ...formData,
            parts: formData.parts.filter((_, i) => i !== index),
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const submitData = {
            final_item_id: parseInt(formData.final_item_id),
            quantity: parseInt(formData.quantity),
            notes: formData.notes || null,
            parts: formData.parts.map((part) => ({
                item_id: parseInt(part.item_id),
                quantity: parseInt(part.quantity),
            })),
        };

        router.post(
            '/inventory/assembly',
            submitData,
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    console.log('Success response:', JSON.stringify((page.props as any)?.flash, null, 2));
                    // Check if there's a success message
                    setIsOpen(false);
                    setErrors({});
                    setFormData({
                        final_item_id: '',
                        quantity: '',
                        notes: '',
                        parts: [{ item_id: '', quantity: '' }],
                    });
                    setIsSubmitting(false);
                },
                onError: (errors: Record<string, string>) => {
                    console.error('Form errors received:', JSON.stringify(errors, null, 2));
                    console.error('Error keys:', Object.keys(errors));
                    
                    // If there are actual error keys, set them
                    if (Object.keys(errors).length > 0) {
                        setErrors(errors);
                    } else {
                        // Show a generic error if no specific errors provided
                        setErrors({ assembly_error: 'An error occurred while creating the assembly' });
                    }
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Item Assembly" />
            <div className="space-y-6">
                {/* Flash Messages */}
                {flashMessage && (
                    <div className={`flex items-center gap-3 p-4 rounded-lg ${
                        flashMessage.type === 'success' 
                            ? 'bg-green-50 text-green-900 border border-green-200' 
                            : 'bg-red-50 text-red-900 border border-red-200'
                    }`}>
                        {flashMessage.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span>{flashMessage.message}</span>
                    </div>
                )}
                <div className="border-t">
                    <div className="border-b px-6 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                                <Input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(event.target.value)
                                    }
                                    placeholder="Search by item, part, or user"
                                    className="sm:w-72"
                                />
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button>Add Assembly</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add Assembly</DialogTitle>
                                    </DialogHeader>
                                    <hr />

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Final Item Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="final-item">
                                        Final Item *
                                    </Label>
                                    <Select
                                        value={formData.final_item_id}
                                        onValueChange={handleFinalItemChange}
                                    >
                                        <SelectTrigger
                                            className={
                                                errors.final_item_id
                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                    : undefined
                                            }
                                        >
                                            <SelectValue placeholder="Select item to create" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {items.filter((item) => item.is_main_assembly)
                                                .length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground">
                                                    No main assembly items available.
                                                </div>
                                            ) : (
                                                items
                                                    .filter(
                                                        (item) => item.is_main_assembly
                                                    )
                                                    .map((item) => (
                                                        <SelectItem
                                                            key={item.id}
                                                            value={String(item.id)}
                                                        >
                                                            {item.name}
                                                        </SelectItem>
                                                    ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Quantity to Create */}
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">
                                        Quantity to Create *
                                    </Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) =>
                                            handleQuantityChange(e.target.value)
                                        }
                                        placeholder="1"
                                        className={
                                            errors.quantity
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>

                                {/* Parts Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Parts Required *</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addPart}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Part
                                        </Button>
                                    </div>

                                    {formData.parts.map((part, index) => (
                                        <div
                                            key={index}
                                            className="flex gap-3 items-end"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs">
                                                    Part Item
                                                </Label>
                                                <Select
                                                    value={part.item_id}
                                                    onValueChange={(value) =>
                                                        handlePartChange(
                                                            index,
                                                            'item_id',
                                                            value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={
                                                            errors[`parts.${index}.item_id`]
                                                                ? 'border-destructive focus-visible:ring-destructive'
                                                                : undefined
                                                        }
                                                    >
                                                        <SelectValue placeholder="Select part" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {items
                                                            .filter(
                                                                (item) =>
                                                                    item.id !==
                                                                    parseInt(
                                                                        formData.final_item_id
                                                                    )
                                                            )
                                                            .map((item) => (
                                                                <SelectItem
                                                                    key={item.id}
                                                                    value={String(
                                                                        item.id
                                                                    )}
                                                                >
                                                                    {item.name}{' '}
                                                                    (Stock:{' '}
                                                                    {item.stock})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <Label className="text-xs">
                                                    Qty per Unit
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={part.quantity}
                                                    onChange={(e) =>
                                                        handlePartChange(
                                                            index,
                                                            'quantity',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="1"
                                                    className={
                                                        errors[`parts.${index}.quantity`]
                                                            ? 'border-destructive focus-visible:ring-destructive'
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                            {formData.parts.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        removePart(index)
                                                    }
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) =>
                                            handleNotesChange(e.target.value)
                                        }
                                        placeholder="Add any notes about this assembly..."
                                        rows={3}
                                    />
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting
                                            ? 'Creating...'
                                            : 'Create Assembly'}
                                    </Button>
                                </DialogFooter>
                            </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Final Item</TableHead>
                                <TableHead>Qty Created</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAssemblies.map((assembly) => (
                                <TableRow
                                    key={assembly.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {assembly.final_item_name}
                                    </TableCell>
                                    <TableCell>{assembly.quantity}x</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {assembly.created_at}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {assembly.user_name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {assembly.notes || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                openViewDialog(assembly)
                                            }
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredAssemblies.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No assemblies match your search.'
                                : 'No assemblies created yet.'}
                        </div>
                    )}
                    {props.assemblies.links.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {props.assemblies.links.map((link) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={link.label}
                                                className="rounded-md border px-3 py-1 text-muted-foreground"
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={link.label}
                                            href={link.url}
                                            className={
                                                link.active
                                                    ? 'rounded-md border border-primary bg-primary px-3 py-1 text-primary-foreground'
                                                    : 'rounded-md border px-3 py-1 text-foreground hover:bg-muted'
                                            }
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isViewOpen} onOpenChange={handleViewToggle}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Assembly Details</DialogTitle>
                    </DialogHeader>
                    <hr />
                    {viewingAssembly && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Final Item
                                    </Label>
                                    <div className="font-medium">
                                        {viewingAssembly.final_item_name}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Quantity Created
                                    </Label>
                                    <div className="font-medium">
                                        {viewingAssembly.quantity}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Created By
                                    </Label>
                                    <div className="font-medium">
                                        {viewingAssembly.user_name}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Created At
                                    </Label>
                                    <div className="font-medium">
                                        {viewingAssembly.created_at}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">
                                    Parts Used
                                </Label>
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Part</TableHead>
                                                <TableHead className="text-right">
                                                    Quantity
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewingAssembly.parts.map((part) => (
                                                <TableRow key={part.id}>
                                                    <TableCell>
                                                        {part.part_name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {part.quantity_used}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {viewingAssembly.notes && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Notes
                                    </Label>
                                    <div className="text-sm text-muted-foreground">
                                        {viewingAssembly.notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => handleViewToggle(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

