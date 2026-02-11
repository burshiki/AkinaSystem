import { FormEvent, useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import type { BreadcrumbItem } from '@/types';

interface Item {
    id: number;
    name: string;
    stock: number;
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
    assemblies: Assembly[];
    items: Item[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item Assembly', href: '/inventory/assembly' },
];

export default function InventoryAssembly() {
    const { props } = usePage<PageProps>();
    const [assemblies, setAssemblies] = useState(props.assemblies || []);
    const [items] = useState(props.items || []);
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        setAssemblies(props.assemblies || []);
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

    const [formData, setFormData] = useState({
        final_item_id: '',
        quantity: '',
        notes: '',
        parts: [{ item_id: '', quantity: '' }] as AssemblyPart[],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

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
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold">Item Assembly</h1>
                        <p className="text-sm text-muted-foreground">
                            Create new items by assembling from parts.
                        </p>
                    </div>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button>Create Assembly</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Assembly</DialogTitle>
                                <DialogDescription>
                                    Select the final item to create and the parts
                                    needed.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Display any general errors */}
                                {(errors.assembly_error || errors.stock_error) && (
                                    <div className="flex items-center gap-3 p-3 bg-red-50 text-red-900 border border-red-200 rounded-lg">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-sm">{errors.assembly_error || errors.stock_error}</p>
                                        </div>
                                    </div>
                                )}
                                {/* Final Item Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="final-item">
                                        Final Item *
                                    </Label>
                                    <Select
                                        value={formData.final_item_id}
                                        onValueChange={handleFinalItemChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select item to create" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {items.map((item) => (
                                                <SelectItem
                                                    key={item.id}
                                                    value={String(item.id)}
                                                >
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.final_item_id && (
                                        <p className="text-sm text-red-600">
                                            {errors.final_item_id}
                                        </p>
                                    )}
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
                                    />
                                    {errors.quantity && (
                                        <p className="text-sm text-red-600">
                                            {errors.quantity}
                                        </p>
                                    )}
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
                                                    <SelectTrigger>
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
                                                {errors[`parts.${index}.item_id`] && (
                                                    <p className="text-xs text-red-600">
                                                        {errors[`parts.${index}.item_id`]}
                                                    </p>
                                                )}
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
                                                />
                                                {errors[`parts.${index}.quantity`] && (
                                                    <p className="text-xs text-red-600">
                                                        {errors[`parts.${index}.quantity`]}
                                                    </p>
                                                )}
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

                                <div className="flex gap-3 justify-end pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
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
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Assemblies List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Assembly History</CardTitle>
                        <CardDescription>
                            All assemblies created in the system
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assemblies.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No assemblies created yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {assemblies.map((assembly) => (
                                    <div
                                        key={assembly.id}
                                        className="border rounded-lg p-4 hover:bg-muted/50"
                                    >
                                        <div className="grid grid-cols-4 gap-4 mb-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Final Item
                                                </p>
                                                <p className="font-semibold">
                                                    {assembly.final_item_name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Qty Created
                                                </p>
                                                <p className="font-semibold">
                                                    {assembly.quantity}x
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Date
                                                </p>
                                                <p className="text-sm">
                                                    {assembly.created_at}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Created By
                                                </p>
                                                <p className="text-sm">
                                                    {assembly.user_name}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Parts Used */}
                                        <div className="bg-muted/30 rounded p-3 text-sm">
                                            <p className="font-medium mb-2">
                                                Parts Used:
                                            </p>
                                            <div className="space-y-1">
                                                {assembly.parts.map((part) => (
                                                    <div
                                                        key={part.id}
                                                        className="flex justify-between text-muted-foreground"
                                                    >
                                                        <span>
                                                            {part.part_name}
                                                        </span>
                                                        <span>
                                                            -{' '}
                                                            {
                                                                part.quantity_used
                                                            }
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {assembly.notes && (
                                            <div className="mt-3 text-sm text-muted-foreground">
                                                <p className="font-medium mb-1">
                                                    Notes:
                                                </p>
                                                <p>{assembly.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

