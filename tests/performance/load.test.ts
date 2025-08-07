describe('Performance Tests', () => {
  it('should handle rapid mission assignments', () => {
    const fleetManager = new FleetManager();
    fleetManager.initializeFleet(100);
    
    const startTime = performance.now();
    
    // Assign 100 missions rapidly
    for (let i = 0; i < 100; i++) {
      const mission = {
        id: `mission-${i}`,
        status: 'created' as const,
        createdAt: new Date(),
        estimatedDuration: 300000
      };
      fleetManager.assignMissionToAvailableRobot(mission);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
  });

  it('should maintain memory efficiency with large datasets', () => {
    const fleetManager = new FleetManager();
    const missionManager = new MissionManager();
    
    fleetManager.initializeFleet(1000);
    
    // Create many missions
    for (let i = 0; i < 1000; i++) {
      missionManager.createMission();
    }
    
    // Memory usage should be reasonable
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
  });
});
