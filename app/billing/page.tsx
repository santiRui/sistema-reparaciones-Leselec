"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, FileText, CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Mock data for repairs in billing stage
const mockBillingRepairs = [
  {
    id: "REP-001",
    entryNumber: "ING-001",
    entryDate: "2024-01-15",
    client: { name: "Juan Pérez", type: "particular" },
    equipment: "Motor Eléctrico",
    brand: "WEG",
    serialNumber: "WEG123456",
    power: "5 HP",
    voltage: "380V",
    diagnosis: "Bobinado quemado",
    budgetAmount: 85000,
    repairManager: "Carlos Rodríguez",
    assembler: "Miguel Torres",
    cashier: "Ana García",
    pickupDate: "2024-01-25",
    pickupPerson: "Juan Pérez",
    pickupId: "12345678",
    invoiceNumber: "",
    invoiceDate: "",
    invoicedAmount: 0,
    paymentMethod: "",
    paymentStatus: "pending",
    stage: "billing",
  },
  {
    id: "REP-002",
    entryNumber: "ING-002",
    entryDate: "2024-01-16",
    client: { name: "Empresa ABC S.A.", type: "empresa" },
    equipment: "Bomba Centrífuga",
    brand: "Grundfos",
    serialNumber: "GRU789012",
    power: "10 HP",
    voltage: "380V",
    diagnosis: "Rodamientos desgastados",
    budgetAmount: 120000,
    repairManager: "Luis Martínez",
    assembler: "Roberto Silva",
    cashier: "Ana García",
    pickupDate: "2024-01-26",
    pickupPerson: "María López",
    pickupId: "87654321",
    invoiceNumber: "FAC-001",
    invoiceDate: "2024-01-26",
    invoicedAmount: 120000,
    paymentMethod: "transferencia",
    paymentStatus: "paid",
    stage: "billing",
  },
]

export default function BillingPage() {
  const [repairs, setRepairs] = useState(mockBillingRepairs)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRepair, setSelectedRepair] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false)
  const [billingData, setBillingData] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    invoicedAmount: "",
    paymentMethod: "",
    paymentStatus: "pending",
  })

  const filteredRepairs = repairs.filter(
    (repair) =>
      repair.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.equipment.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewRepair = (repair: any) => {
    setSelectedRepair(repair)
    setIsViewDialogOpen(true)
  }

  const handleBillRepair = (repair: any) => {
    setSelectedRepair(repair)
    setBillingData({
      invoiceNumber: repair.invoiceNumber || "",
      invoiceDate: repair.invoiceDate || new Date().toISOString().split("T")[0],
      invoicedAmount: repair.invoicedAmount?.toString() || repair.budgetAmount?.toString() || "",
      paymentMethod: repair.paymentMethod || "",
      paymentStatus: repair.paymentStatus || "pending",
    })
    setIsBillingDialogOpen(true)
  }

  const handleSaveBilling = () => {
    if (
      !billingData.invoiceNumber ||
      !billingData.invoiceDate ||
      !billingData.invoicedAmount ||
      !billingData.paymentMethod
    ) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setRepairs((prev) =>
      prev.map((repair) =>
        repair.id === selectedRepair.id
          ? {
              ...repair,
              invoiceNumber: billingData.invoiceNumber,
              invoiceDate: billingData.invoiceDate,
              invoicedAmount: Number.parseFloat(billingData.invoicedAmount),
              paymentMethod: billingData.paymentMethod,
              paymentStatus: billingData.paymentStatus,
            }
          : repair,
      ),
    )

    toast({
      title: "Facturación actualizada",
      description: `Se actualizó la facturación para ${selectedRepair.entryNumber}`,
    })

    setIsBillingDialogOpen(false)
    setBillingData({
      invoiceNumber: "",
      invoiceDate: "",
      invoicedAmount: "",
      paymentMethod: "",
      paymentStatus: "pending",
    })
  }

  const handleCompleteRepair = (repairId: string) => {
    setRepairs((prev) => prev.map((repair) => (repair.id === repairId ? { ...repair, stage: "completed" } : repair)))

    toast({
      title: "Reparación completada",
      description: "La reparación ha sido marcada como completada",
    })
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pagado
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "overdue":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Vencido
          </Badge>
        )
      default:
        return <Badge variant="secondary">Sin estado</Badge>
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "efectivo":
        return "Efectivo"
      case "transferencia":
        return "Transferencia"
      case "cheque":
        return "Cheque"
      case "tarjeta":
        return "Tarjeta"
      default:
        return method
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-600">Gestión de facturación y cobros</p>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por número de ingreso, cliente o equipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Por Facturar</p>
                <p className="text-2xl font-bold text-blue-600">{repairs.filter((r) => !r.invoiceNumber).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Pagado</p>
                <p className="text-2xl font-bold text-green-600">
                  {repairs.filter((r) => r.paymentStatus === "paid").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repairs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reparaciones en Facturación</CardTitle>
          <CardDescription>Lista de reparaciones listas para facturar o ya facturadas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Ingreso</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>N° Factura</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado Pago</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell className="font-medium">{repair.entryNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{repair.client.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {repair.client.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{repair.equipment}</p>
                      <p className="text-sm text-gray-500">{repair.brand}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {repair.invoiceNumber || (
                      <Badge variant="outline" className="text-yellow-600">
                        Sin facturar
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    $
                    {repair.invoicedAmount
                      ? repair.invoicedAmount.toLocaleString()
                      : repair.budgetAmount?.toLocaleString()}
                  </TableCell>
                  <TableCell>{getPaymentStatusBadge(repair.paymentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewRepair(repair)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleBillRepair(repair)}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      {repair.invoiceNumber && repair.paymentStatus === "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteRepair(repair.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Repair Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Reparación - {selectedRepair?.entryNumber}</DialogTitle>
            <DialogDescription>Información completa de la reparación</DialogDescription>
          </DialogHeader>

          {selectedRepair && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reception Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recepción</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Fecha:</strong> {selectedRepair.entryDate}
                  </div>
                  <div>
                    <strong>Cliente:</strong> {selectedRepair.client.name}
                  </div>
                  <div>
                    <strong>Equipo:</strong> {selectedRepair.equipment}
                  </div>
                  <div>
                    <strong>Marca:</strong> {selectedRepair.brand}
                  </div>
                  <div>
                    <strong>N° Serie:</strong> {selectedRepair.serialNumber}
                  </div>
                  <div>
                    <strong>Potencia:</strong> {selectedRepair.power}
                  </div>
                  <div>
                    <strong>Tensión:</strong> {selectedRepair.voltage}
                  </div>
                </CardContent>
              </Card>

              {/* Budget Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Presupuesto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Diagnóstico:</strong> {selectedRepair.diagnosis}
                  </div>
                  <div>
                    <strong>Monto:</strong> ${selectedRepair.budgetAmount?.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              {/* Repair Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reparación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Encargado:</strong> {selectedRepair.repairManager}
                  </div>
                  <div>
                    <strong>Armador:</strong> {selectedRepair.assembler}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Cajero:</strong> {selectedRepair.cashier}
                  </div>
                  <div>
                    <strong>Fecha Retiro:</strong> {selectedRepair.pickupDate}
                  </div>
                  <div>
                    <strong>Retirante:</strong> {selectedRepair.pickupPerson}
                  </div>
                  <div>
                    <strong>DNI:</strong> {selectedRepair.pickupId}
                  </div>
                </CardContent>
              </Card>

              {/* Billing Info */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Facturación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>N° Factura:</strong> {selectedRepair.invoiceNumber || "Sin facturar"}
                  </div>
                  <div>
                    <strong>Fecha Factura:</strong> {selectedRepair.invoiceDate || "-"}
                  </div>
                  <div>
                    <strong>Monto Facturado:</strong> ${selectedRepair.invoicedAmount?.toLocaleString() || "-"}
                  </div>
                  <div>
                    <strong>Forma de Pago:</strong> {getPaymentMethodLabel(selectedRepair.paymentMethod) || "-"}
                  </div>
                  <div>
                    <strong>Estado:</strong> {getPaymentStatusBadge(selectedRepair.paymentStatus)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Billing Dialog */}
      <Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Facturación - {selectedRepair?.entryNumber}</DialogTitle>
            <DialogDescription>Complete la información de facturación</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="invoiceNumber">Número de Factura *</Label>
              <Input
                id="invoiceNumber"
                value={billingData.invoiceNumber}
                onChange={(e) => setBillingData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="FAC-001"
              />
            </div>

            <div>
              <Label htmlFor="invoiceDate">Fecha de Factura *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={billingData.invoiceDate}
                onChange={(e) => setBillingData((prev) => ({ ...prev, invoiceDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="invoicedAmount">Monto Facturado *</Label>
              <Input
                id="invoicedAmount"
                type="number"
                value={billingData.invoicedAmount}
                onChange={(e) => setBillingData((prev) => ({ ...prev, invoicedAmount: e.target.value }))}
                placeholder="85000"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pago *</Label>
              <Select
                value={billingData.paymentMethod}
                onValueChange={(value) => setBillingData((prev) => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar forma de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentStatus">Estado de Pago</Label>
              <Select
                value={billingData.paymentStatus}
                onValueChange={(value) => setBillingData((prev) => ({ ...prev, paymentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBillingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBilling}>Guardar Facturación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
