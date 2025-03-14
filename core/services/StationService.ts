// src/core/services/StationService.ts
import { IStationService } from '@/core/interfaces/IStationService';
import { GasStation } from '@/core/models/GasStation';
import { IGasStationRepository } from '@/core/interfaces/IGasStationRepository';

export class StationService implements IStationService {
  private gasStationRepository: IGasStationRepository;

  constructor(gasStationRepository: IGasStationRepository) {
    this.gasStationRepository = gasStationRepository;
  }

  async getStationById(id: string): Promise<GasStation | null> {
    return this.gasStationRepository.findById(id);
  }

  async getStationsByBrand(brand: string): Promise<GasStation[]> {
    return this.gasStationRepository.findByBrand(brand);
  }

  async getStationsByCity(city: string): Promise<GasStation[]> {
    return this.gasStationRepository.findByCity(city);
  }

  async getStationsNearby(
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<GasStation[]> {
    return this.gasStationRepository.findNearby(
      { latitude: lat, longitude: lon },
      radiusKm
    );
  }

  async searchStations(query: string): Promise<GasStation[]> {
    return this.gasStationRepository.search(query);
  }
}
