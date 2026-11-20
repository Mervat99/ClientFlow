import { Controller, Get, Post, Body } from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
@Controller("clients")
export class ClientsController {
  constructor(private service: ClientsService) {}
  @Get() all() {
    return this.service.all();
  }
  @Post() create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }
}
